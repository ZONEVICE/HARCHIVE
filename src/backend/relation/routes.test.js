// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted relation — and for the purge.
const relation_service = require('./service')

// The fixed catalogue of relation types, which GET /api/relation/types/ must publish.
const { RELATION_TYPES } = require('./types-of-relation')

// The three entity catalogues, for the coverage guard of the link blocks.
const { ENTITY_HTTP, ENTITY_INTERNAL, ENTITY_REBEL } = require('../core/constants')

// The entities the link blocks relate, reached through their services to build real records
//  on either end and to purge them afterwards.
const directory_service = require('../directory/service')
const file_service = require('../file/service')
const metadata_service = require('../metadata/service')
const permission_service = require('../permission/service')
const tag_service = require('../tag/service')
const user_service = require('../user/service')
const workspace_service = require('../workspace/service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  name created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// Note: an end of a relation is a name and an id, and nothing checks that the record exists —
//  a link may outlive what it points at. The route blocks below use synthetic ids, derived from
//  the run so that two runs never build the same five values and meet a live twin.
const BASE_ID = 700000000 + (RUN % 100000000)

// The relation most route tests below work on.
const SAMPLE = {
    id_1: BASE_ID + 1,
    entity_1: 'file',
    id_2: BASE_ID + 2,
    entity_2: 'metadata',
    relation_type: 'linked',
    note: `file linked to metadata ${RUN}`
}

// A second relation, sharing no end with the first.
const SECOND_SAMPLE = {
    id_1: BASE_ID + 3,
    entity_1: 'directory',
    id_2: BASE_ID + 4,
    entity_2: 'directory',
    relation_type: 'contains',
    note: null
}

// The columns of the relation table, in order: what every route must answer, and nothing else.
const COLUMNS = ['id', 'id_1', 'entity_1', 'id_2', 'entity_2', 'relation_type', 'note', 'deleted_at']

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guards.
const ANONYMOUS = { validateStatus: () => true }

// Ids of every relation this suite creates, purged in afterAll whatever state they end in.
const CREATED_RELATION_IDS = []

// One purge per record the link blocks create on either end, run in afterAll.
const PURGES = []

// The stored rows of SAMPLE and SECOND_SAMPLE, known once POST has created them.
let sample = null
let second = null

// The entities a link block covered, compared against the catalogues by the coverage guard.
const COVERED_ENTITIES = []

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

// Signs in as the seeded admin and keeps its session cookie for the rest of the file.
const loginAsAdmin = async () => {
    const res = await axios.post(`${URL}/api/user/login/`, { username: ADMIN_USERNAME, password: ADMIN_DEFAULT_PASSWORD })
    AS_ADMIN.headers.Cookie = res.headers['set-cookie'][0].split(';')[0]
}

// One wrapper per route in routes.js.
const relationGetAll = () => axios.get(`${URL}/api/relation/`, AS_ADMIN)
const relationGetEntities = () => axios.get(`${URL}/api/relation/entities/`, AS_ADMIN)
const relationGetTypes = () => axios.get(`${URL}/api/relation/types/`, AS_ADMIN)
const relationGetById = (id) => axios.get(`${URL}/api/relation/id/${id}/`, AS_ADMIN)
const relationGetByEntity = (entity) => axios.get(`${URL}/api/relation/entity/${entity}/`, AS_ADMIN)
const relationGetByEntityId = (id) => axios.get(`${URL}/api/relation/entity_id/${id}/`, AS_ADMIN)
const relationUpdate = (body) => axios.put(`${URL}/api/relation/update/`, body, AS_ADMIN)
const relationDelete = (id) => axios.delete(`${URL}/api/relation/id/${id}/`, AS_ADMIN)

// POST /api/relation/, remembering every row it hands back for the purge.
const relationPost = async (body) => {
    const res = await axios.post(`${URL}/api/relation/`, body, AS_ADMIN)
    if (res.status === 201) CREATED_RELATION_IDS.push(res.data.data.id)
    return res
}

// The body of an update that rewrites a stored row with some fields changed. The update route
//  replaces the whole record, so every other field is sent back untouched.
const bodyFor = (row, changes) => {
    const { deleted_at, ...fields } = row
    return { ...fields, ...changes }
}

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created, links first, and nothing else: no table is ever emptied.
afterAll(() => {
    for (const id of CREATED_RELATION_IDS) relation_service.hardDelete(id)
    for (const purge of PURGES) purge()
})

// =====================================================================================
// CATALOGUES.
// =====================================================================================

describe('GET /api/relation/entities/', () => {
    it('returns 200 with every entity that owns a table', async () => {
        const res = await relationGetEntities()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation entities retrieved')
        expect(res.data.data).toEqual(relation_service.getEntities())
        for (const entity of ENTITY_HTTP) expect(res.data.data).toContain(entity)
    })

    it('leaves out an entity that owns no table, since an end must point at a row', async () => {
        const res = await relationGetEntities()
        expect(res.data.data).not.toContain('seeder')
    })
})

describe('GET /api/relation/types/', () => {
    it('returns 200 with the type catalogue', async () => {
        const res = await relationGetTypes()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation types retrieved')
        expect(res.data.data).toEqual(RELATION_TYPES)
    })
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/relation/', () => {
    it('returns 201 with the stored row, the generated id included', async () => {
        const res = await relationPost(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation created')
        expect(res.data.data).toEqual({ ...SAMPLE, id: res.data.data.id, deleted_at: null })
        sample = res.data.data
    })

    it('stores note as null when none is sent', async () => {
        const { note, ...without_note } = SECOND_SAMPLE
        const res = await relationPost(without_note)
        expect(res.status).toBe(201)
        expect(res.data.data.note).toBeNull()
        second = res.data.data
    })

    it('ignores a deleted_at in the body: a relation is always born live', async () => {
        const res = await relationPost({ ...SAMPLE, id_2: BASE_ID + 10, deleted_at: 1 })
        expect(res.status).toBe(201)
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 409 on a live relation with the same two ends and type', async () => {
        const res = await relationPost({ ...SAMPLE, note: 'a different note changes nothing' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation already exists')
    })

    it('accepts the same two ends with another type: the type is part of the identity', async () => {
        const res = await relationPost({ ...SAMPLE, relation_type: 'sibling' })
        expect(res.status).toBe(201)
    })

    it('brings back a deleted twin instead of duplicating it, with the new note', async () => {
        const body = { ...SAMPLE, id_2: BASE_ID + 11, note: 'first note' }
        const created = await relationPost(body)
        await relationDelete(created.data.data.id)

        const res = await relationPost({ ...body, note: 'second note' })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation created')
        expect(res.data.data.id).toBe(created.data.data.id)
        expect(res.data.data.note).toBe('second note')
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 400 for a relation whose two ends are the same record', async () => {
        const res = await relationPost({ ...SAMPLE, id_2: SAMPLE.id_1, entity_2: SAMPLE.entity_1 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation reflexive')
    })

    it('accepts the same id on two different entities: ids collide across tables', async () => {
        const res = await relationPost({ ...SAMPLE, id_2: SAMPLE.id_1, entity_2: 'tag' })
        expect(res.status).toBe(201)
    })

    it('returns 400 for an end naming an entity that owns no table', async () => {
        const res = await relationPost({ ...SAMPLE, entity_2: 'seeder' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation entity invalid')
    })

    it('returns 400 for an entity in no catalogue, a type outside the catalogue and a bad id', async () => {
        const bodies = [
            { ...SAMPLE, entity_1: 'not-a-real-entity' },
            { ...SAMPLE, relation_type: 'owns' },
            { ...SAMPLE, id_1: '1' },
            { ...SAMPLE, id_2: 0 },
            { ...SAMPLE, note: 5 },
            {}
        ]
        for (const body of bodies) {
            const res = await relationPost(body)
            expect(res.status).toBe(400)
            expect(res.data.status).toBe('warning')
            expect(res.data.description).toBe('relation invalid')
        }
    })
})

describe('GET /api/relation/', () => {
    it('returns 200 with the live relations', async () => {
        const res = await relationGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation retrieved')
        expect(res.data.data).toContainEqual(sample)
        expect(res.data.data.every((relation) => relation.deleted_at === null)).toBe(true)
    })
})

describe('GET /api/relation/id/:id/ — the record it returns', () => {
    it('returns 200 with exactly the columns of the table', async () => {
        const res = await relationGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation retrieved')
        expect(res.data.data).toEqual(sample)
        expect(Object.keys(res.data.data).sort()).toEqual([...COLUMNS].sort())
    })

    it('agrees with every listing route, from either side', async () => {
        // Two doors into the same row must answer the same row.
        const by_entity_1 = await relationGetByEntity(SAMPLE.entity_1)
        const by_entity_2 = await relationGetByEntity(SAMPLE.entity_2)
        const by_id_1 = await relationGetByEntityId(SAMPLE.id_1)
        const by_id_2 = await relationGetByEntityId(SAMPLE.id_2)

        for (const listing of [by_entity_1, by_entity_2, by_id_1, by_id_2]) {
            expect(listing.data.data).toContainEqual(sample)
        }
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await relationGetById(999999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation not found')
    })

    it('returns 404, not 500, for an id past the safe integer range', async () => {
        const res = await relationGetById('9007199254740993')
        expect(res.status).toBe(404)
    })

    it('returns 404 for a deleted relation, exactly like a missing one', async () => {
        const created = await relationPost({ ...SAMPLE, id_2: BASE_ID + 12 })
        await relationDelete(created.data.data.id)

        const res = await relationGetById(created.data.data.id)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('relation not found')
    })
})

describe('GET /api/relation/id/:id/ — the URL parameter', () => {
    // Every segment that is not a whole number from 1 up is a malformed request, never a miss.
    const MALFORMED = ['not-an-id', '5abc', '0', '-1', '1.5', 'Infinity', 'NaN', '1e400', '%20', 'true', `1%20OR%201%3D1`, `1%3B%20DROP%20TABLE%20relation`]

    it.each(MALFORMED)('returns 400 for %s', async (segment) => {
        const res = await relationGetById(segment)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation invalid')
    })

    it('leaves the table intact after every injection attempt', async () => {
        expect((await relationGetById(sample.id)).data.data).toEqual(sample)
    })

    it('never reaches the handler without an id segment, or with extra segments', async () => {
        // No route matches, so Express answers its own 404 and the envelope never appears.
        expect((await axios.get(`${URL}/api/relation/id/`, AS_ADMIN)).status).toBe(404)
        expect((await axios.get(`${URL}/api/relation/id/${sample.id}/extra/`, AS_ADMIN)).status).toBe(404)
    })

    it('answers the same with or without the trailing slash', async () => {
        const res = await axios.get(`${URL}/api/relation/id/${sample.id}`, AS_ADMIN)
        expect(res.data.data).toEqual(sample)
    })
})

describe('GET /api/relation/id/:id/ — notes are stored exactly as sent', () => {
    // Free text nothing branches on, so every byte must come back as it went in.
    const NOTES = [
        '',
        '   ',
        'Ñandú, Ärger, 日本語, 🐈',
        "it's '; DROP TABLE relation; --",
        'a "quoted" \\ {brace}',
        'line one\nline two\ttabbed',
        'x'.repeat(10000)
    ]

    it.each(NOTES.map((note, index) => [index, note]))('round-trips note #%i', async (index, note) => {
        const created = await relationPost({ ...SAMPLE, id_2: BASE_ID + 100 + index, note })
        expect(created.status).toBe(201)

        const res = await relationGetById(created.data.data.id)
        expect(res.data.data.note).toBe(note)
    })
})

describe('GET /api/relation/entity/:entity/', () => {
    it('returns 200 with the relations naming the entity on either side', async () => {
        const res = await relationGetByEntity('directory')
        expect(res.status).toBe(200)
        expect(res.data.description).toBe('relation retrieved')
        expect(res.data.data).toContainEqual(second)
        expect(res.data.data.every((row) => row.entity_1 === 'directory' || row.entity_2 === 'directory')).toBe(true)
    })

    it('returns 400 for a name in no catalogue', async () => {
        const res = await relationGetByEntity('not-a-real-entity')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation entity invalid')
    })
})

describe('GET /api/relation/entity_id/:id/', () => {
    it('returns 200 with the relations where the id appears on either side', async () => {
        const res = await relationGetByEntityId(SECOND_SAMPLE.id_2)
        expect(res.status).toBe(200)
        expect(res.data.description).toBe('relation retrieved')
        expect(res.data.data).toEqual([second])
    })

    it('returns 200 with an empty array when nothing relates to the id', async () => {
        // "What relates to this?" — nothing is a real answer, never a 404.
        const res = await relationGetByEntityId(999999999)
        expect(res.status).toBe(200)
        expect(res.data.data).toEqual([])
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await relationGetByEntityId('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('relation invalid')
    })
})

describe('PUT /api/relation/update/', () => {
    it('returns 200 with the stored row, every field rewritten', async () => {
        const body = bodyFor(second, { id_2: BASE_ID + 5, relation_type: 'sibling', note: 'rewritten' })
        const res = await relationUpdate(body)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation updated')
        expect(res.data.data).toEqual({ ...body, deleted_at: null })
        second = res.data.data
    })

    it('lets a relation keep its own ends', async () => {
        const res = await relationUpdate(bodyFor(sample, { note: 'only the note changed' }))
        expect(res.status).toBe(200)
        sample = res.data.data
    })

    it('ignores a deleted_at in the body: an update never deletes', async () => {
        const res = await relationUpdate({ ...bodyFor(sample, {}), deleted_at: true })
        expect(res.status).toBe(200)
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 409 when moving onto the ends and type of another live relation', async () => {
        const res = await relationUpdate(bodyFor(second, { id_1: SAMPLE.id_1, entity_1: SAMPLE.entity_1, id_2: SAMPLE.id_2, entity_2: SAMPLE.entity_2, relation_type: SAMPLE.relation_type }))
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation already exists')
    })

    it('returns 400 when the update would link a record to itself', async () => {
        const res = await relationUpdate(bodyFor(second, { id_2: second.id_1, entity_2: second.entity_1 }))
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('relation reflexive')
    })

    it('returns 400 for an end naming an entity that owns no table', async () => {
        const res = await relationUpdate(bodyFor(second, { entity_1: 'seeder' }))
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('relation entity invalid')
    })

    it('returns 400 when a field is missing: an update replaces the whole record', async () => {
        const { relation_type, ...without_type } = bodyFor(second, {})
        const res = await relationUpdate(without_type)
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('relation invalid')
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await relationUpdate(bodyFor(second, { id: 999999999 }))
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation not found')
    })
})

describe('DELETE /api/relation/id/:id/', () => {
    // Id of the relation deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live relation and answers its id alone', async () => {
        const created = await relationPost({ ...SAMPLE, id_2: BASE_ID + 13 })
        deleted_id = created.data.data.id

        const res = await relationDelete(deleted_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation deleted')
        expect(res.data.data).toBe(deleted_id)

        // Gone from every listing, stamped for the backend.
        expect((await relationGetAll()).data.data.some((row) => row.id === deleted_id)).toBe(false)
        expect(typeof relation_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a relation already deleted, and keeps its first stamp', async () => {
        const before = relation_service.getDeletedById(deleted_id)

        const res = await relationDelete(deleted_id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation not found')
        expect(relation_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 404 on an update of the deleted relation, and leaves it deleted', async () => {
        const deleted = relation_service.getDeletedById(deleted_id)
        const res = await relationUpdate(bodyFor(deleted, { note: 'resurrection attempt' }))
        expect(res.status).toBe(404)
        expect(relation_service.getDeletedById(deleted_id)).not.toBeNull()
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await relationDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('relation invalid')
    })
})

describe('the guards protect the writes, not the reads', () => {
    // relation keeps its GET routes open: the GUI draws the structure of the archive before
    //  anyone has signed in.
    it('lets an anonymous client read every GET route', async () => {
        expect((await axios.get(`${URL}/api/relation/`, ANONYMOUS)).status).toBe(200)
        expect((await axios.get(`${URL}/api/relation/entities/`, ANONYMOUS)).status).toBe(200)
        expect((await axios.get(`${URL}/api/relation/types/`, ANONYMOUS)).status).toBe(200)
        expect((await axios.get(`${URL}/api/relation/id/${sample.id}/`, ANONYMOUS)).data.data).toEqual(sample)
        expect((await axios.get(`${URL}/api/relation/entity/file/`, ANONYMOUS)).status).toBe(200)
        expect((await axios.get(`${URL}/api/relation/entity_id/${SAMPLE.id_1}/`, ANONYMOUS)).status).toBe(200)
    })

    it('answers an anonymous client the same 400 and 404 as a signed-in one', async () => {
        expect((await axios.get(`${URL}/api/relation/id/not-an-id/`, ANONYMOUS)).status).toBe(400)
        expect((await axios.get(`${URL}/api/relation/id/999999999/`, ANONYMOUS)).status).toBe(404)
    })

    it('answers 401 on a create, an update and a delete without a session', async () => {
        const create = await axios.post(`${URL}/api/relation/`, { ...SAMPLE, id_2: BASE_ID + 14 }, ANONYMOUS)
        const update = await axios.put(`${URL}/api/relation/update/`, bodyFor(sample, {}), ANONYMOUS)
        const remove = await axios.delete(`${URL}/api/relation/id/${sample.id}/`, ANONYMOUS)

        for (const res of [create, update, remove]) {
            expect(res.status).toBe(401)
            expect(res.data.status).toBe('failed')
            expect(res.data.description).toBe('authentication required')
        }

        // The guard runs before the handler, so the relation is still there.
        expect(relation_service.getById(sample.id)).not.toBeNull()
    })
})

// =====================================================================================
// LINKS BETWEEN REAL RECORDS.
//
//  An entity is never associated with another through a column, only through a relation
//  record, so a test that reads back a link — created, listed, deleted, created again over its
//  deleted twin, surviving a rename or a deletion on either side — is a relation test, even
//  when the record on the other side belongs to another entity. Logic computed *over* a link
//  (what a user may do) belongs to the entity that computes it: see permission's suites.
// =====================================================================================

// One builder per table-owning entity: it creates a real record through the entity's service,
//  registers its purge, and answers the record's id.
const RECORD_BUILDERS = {
    directory: () => {
        const created = directory_service.create(directory_service.buildForCreate({ name: `Rel Directory ${RUN}` }))
        PURGES.push(() => directory_service.hardDelete(created.id))
        return created.id
    },
    file: () => {
        const created = file_service.create(file_service.buildForCreate({ name: `rel-${RUN}.txt`, hash_256_sha: `sha-${RUN}`, relative_path: '/', extension: 'txt' }))
        PURGES.push(() => file_service.hardDelete(created.id))
        return created.id
    },
    metadata: () => {
        const created = metadata_service.create(metadata_service.buildForCreate({ name: `rel-metadata-${RUN}`, value: 'x' }))
        PURGES.push(() => metadata_service.hardDeleteByName(created.name))
        return created.id
    },
    permission: () => {
        const created = permission_service.create(permission_service.buildForCreate({ name: `rel-permission-${RUN}` }))
        PURGES.push(() => permission_service.hardDelete(created.id))
        return created.id
    },
    relation: () => {
        const created = relation_service.create(relation_service.buildForCreate({ ...SAMPLE, id_2: BASE_ID + 20, note: 'the record of relation x tag' }))
        CREATED_RELATION_IDS.push(created.id)
        return created.id
    },
    tag: () => {
        const created = tag_service.create(tag_service.buildForCreate({ name: `rel-antecedent-${RUN}` }))
        PURGES.push(() => tag_service.hardDelete(created.id))
        return created.id
    },
    user: () => {
        const created = user_service.create(user_service.buildForCreate({ username: `rel-user-${RUN}`, password: 'x' }))
        PURGES.push(() => user_service.hardDelete(created.id))
        return created.id
    },
    workspace: () => {
        const created = workspace_service.create(workspace_service.buildForCreate({ name: `Rel ${RUN}`, path_absolute: `/home/rel/${RUN}/`, path_relative: 'rel/' }))
        PURGES.push(() => workspace_service.hardDelete(created.id))
        return created.id
    }
}

// Every table-owning entity is tagged with a tag of its own, through the real routes. A tag
//  tagged with a tag would be a strange sentence, so tag x tag uses `implies` instead.
describe.each(Object.keys(RECORD_BUILDERS))('%s x tag — a live link to a tag', (entity) => {
    // The record on the first side, the tag on the second, and the link between them.
    let record_id = null
    let tag = null
    let link = null

    // The type the pair is linked with.
    const relation_type = entity === 'tag' ? 'implies' : 'tagged'

    beforeAll(async () => {
        COVERED_ENTITIES.push(entity)
        record_id = RECORD_BUILDERS[entity]()

        // The tag is created over HTTP: its routes are part of what a client uses with the link.
        const created = await axios.post(`${URL}/api/tag/`, { name: `rel-${entity}-tag-${RUN}` }, AS_ADMIN)
        tag = created.data.data
        PURGES.push(() => tag_service.hardDelete(tag.id))
    })

    it('links the record to the tag', async () => {
        const res = await relationPost({ id_1: record_id, entity_1: entity, id_2: tag.id, entity_2: 'tag', relation_type })
        expect(res.status).toBe(201)
        link = res.data.data
    })

    it('lists the link from the record side, matching on id and entity', async () => {
        // Ids collide across tables, so the id alone would also match other entities' rows.
        const res = await relationGetByEntityId(record_id)
        const found = res.data.data.filter((row) => row.id_1 === record_id && row.entity_1 === entity && row.entity_2 === 'tag')
        expect(found).toEqual([link])
    })

    it('keeps the link through a rename of the tag', async () => {
        const renamed = await axios.put(`${URL}/api/tag/update/`, { id: tag.id, name: `rel-${entity}-renamed-${RUN}`, metadata: '{}' }, AS_ADMIN)
        expect(renamed.status).toBe(200)
        expect((await relationGetById(link.id)).data.data).toEqual(link)
    })

    it('brings the same link back when it is deleted and created again', async () => {
        await relationDelete(link.id)
        expect((await relationGetById(link.id)).status).toBe(404)

        const res = await relationPost({ id_1: record_id, entity_1: entity, id_2: tag.id, entity_2: 'tag', relation_type })
        expect(res.status).toBe(201)
        expect(res.data.data.id).toBe(link.id)
    })

    it('keeps the link readable after the tag itself is deleted', async () => {
        // A link may outlive what it points at: no foreign key, no cascade.
        expect((await axios.delete(`${URL}/api/tag/id/${tag.id}/`, AS_ADMIN)).status).toBe(200)
        expect((await relationGetById(link.id)).data.data.id_2).toBe(tag.id)
    })
})

describe('directory x file — "contains" and "sibling"', () => {
    // The parent directory, two files inside it, and the links between them.
    let directory_id = null
    let file_id = null
    let second_file_id = null

    beforeAll(() => {
        directory_id = RECORD_BUILDERS.directory()
        file_id = RECORD_BUILDERS.file()
        second_file_id = RECORD_BUILDERS.file()
    })

    it('puts both files inside the directory, the container always id_1', async () => {
        for (const id of [file_id, second_file_id]) {
            const res = await relationPost({ id_1: directory_id, entity_1: 'directory', id_2: id, entity_2: 'file', relation_type: 'contains' })
            expect(res.status).toBe(201)
        }

        // Matched on id and entity: a file and a directory may well share the same number.
        const res = await relationGetByEntityId(directory_id)
        const contained = res.data.data.filter((row) => row.entity_1 === 'directory' && row.id_1 === directory_id && row.relation_type === 'contains')
        expect(contained.map((row) => row.id_2).sort()).toEqual([file_id, second_file_id].sort())
    })

    it('makes the two files siblings', async () => {
        const res = await relationPost({ id_1: file_id, entity_1: 'file', id_2: second_file_id, entity_2: 'file', relation_type: 'sibling' })
        expect(res.status).toBe(201)
    })

    it('keeps the containment readable after the file is deleted', async () => {
        expect((await axios.delete(`${URL}/api/file/id/${file_id}/`, AS_ADMIN)).status).toBe(200)

        const res = await relationGetByEntityId(file_id)
        expect(res.data.data.some((row) => row.entity_1 === 'directory' && row.id_2 === file_id && row.entity_2 === 'file')).toBe(true)
    })
})

describe('metadata x workspace — a direct link between two non-tag records', () => {
    it('links a metadata record to the workspace it describes', async () => {
        const metadata_id = metadata_service.create(metadata_service.buildForCreate({ name: `rel-workspace-metadata-${RUN}`, value: 'default' })).id
        PURGES.push(() => metadata_service.hardDeleteByName(`rel-workspace-metadata-${RUN}`))
        const workspace_id = workspace_service.create(workspace_service.buildForCreate({ name: `Described ${RUN}`, path_absolute: `/home/described/${RUN}/`, path_relative: 'd/' })).id
        PURGES.push(() => workspace_service.hardDelete(workspace_id))

        const res = await relationPost({ id_1: metadata_id, entity_1: 'metadata', id_2: workspace_id, entity_2: 'workspace', relation_type: 'linked' })
        expect(res.status).toBe(201)

        const listed = await relationGetByEntity('workspace')
        expect(listed.data.data).toContainEqual(res.data.data)
    })
})

describe('the link blocks cover every table-owning entity', () => {
    it('covers exactly the members of the three catalogues that own a table', () => {
        // Adding, removing or renaming an entity fails here instead of silently losing coverage.
        const catalogues = [...ENTITY_HTTP, ...ENTITY_INTERNAL, ...ENTITY_REBEL]
        const relatable = catalogues.filter((entity) => relation_service.isEntityRelatable(entity) === true)
        expect([...COVERED_ENTITIES].sort()).toEqual([...relatable].sort())
    })
})
