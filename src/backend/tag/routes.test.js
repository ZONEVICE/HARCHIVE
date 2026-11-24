// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted tag — and for the purge.
const tag_service = require('./service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  name created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The names this suite creates, purged in afterAll whatever state they end in.
const NAME = `portrait-${RUN}`
const NAME_ACCENTED = `ilustración digital ${RUN}`
const NAME_DEFAULT_BLOB = `sketch-${RUN}`
const NAME_HELD = `held-${RUN}`
const NAME_TO_DELETE = `to-delete-${RUN}`
const NAME_RENAMED = `renamed-${RUN}`
const CREATED_NAMES = [NAME, NAME_ACCENTED, NAME_DEFAULT_BLOB, NAME_HELD, NAME_TO_DELETE, NAME_RENAMED]

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// The stored row of NAME, known once POST has created it.
let sample = null

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

// Signs in as the seeded admin and keeps its session cookie for the rest of the file.
const loginAsAdmin = async () => {
    const res = await axios.post(`${URL}/api/user/login/`, { username: ADMIN_USERNAME, password: ADMIN_DEFAULT_PASSWORD })
    AS_ADMIN.headers.Cookie = res.headers['set-cookie'][0].split(';')[0]
}

// One wrapper per route in routes.js.
const tagGetAll = () => axios.get(`${URL}/api/tag/`, AS_ADMIN)
const tagGetById = (id) => axios.get(`${URL}/api/tag/id/${id}/`, AS_ADMIN)
const tagGetByName = (name) => axios.get(`${URL}/api/tag/name/${encodeURIComponent(name)}/`, AS_ADMIN)
const tagPost = (body) => axios.post(`${URL}/api/tag/`, body, AS_ADMIN)
const tagUpdate = (body) => axios.put(`${URL}/api/tag/update/`, body, AS_ADMIN)
const tagDelete = (id) => axios.delete(`${URL}/api/tag/id/${id}/`, AS_ADMIN)

// Removes one tag this suite created, whether it ended live or deleted.
const purgeTag = (name) => {
    // A live tag answers the ordinary lookup, a deleted one only its twin.
    const live = tag_service.getByName(name)
    if (live !== null) return tag_service.hardDelete(live.id)

    const deleted = tag_service.getDeletedByName(name)
    if (deleted !== null) return tag_service.hardDelete(deleted.id)
}

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created and nothing else: no table is ever emptied.
afterAll(() => {
    for (const name of CREATED_NAMES) purgeTag(name)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/tag/', () => {
    it('returns 201 with the stored row', async () => {
        const res = await tagPost({ name: NAME, metadata: '{"color":"blue"}' })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag created')
        expect(typeof res.data.data.id).toBe('number')
        expect(res.data.data.name).toBe(NAME)
        expect(res.data.data.metadata).toBe('{"color":"blue"}')
        expect(res.data.data.deleted_at).toBeNull()
        sample = res.data.data
    })

    it('stores the default blob when metadata is omitted', async () => {
        const res = await tagPost({ name: NAME_DEFAULT_BLOB })
        expect(res.status).toBe(201)
        expect(res.data.data.metadata).toBe('{}')
    })

    it('stores the name folded to lower case, accents composed and spaces trimmed', async () => {
        // The name is an identity key: NFC, trimmed and lower case, whatever was typed.
        const res = await tagPost({ name: `  ${NAME_ACCENTED.toUpperCase().normalize('NFD')}  ` })
        expect(res.status).toBe(201)
        expect(res.data.data.name).toBe(NAME_ACCENTED)
    })

    it('ignores a deleted_at in the body: a tag is always born live', async () => {
        const res = await tagPost({ name: NAME_HELD, deleted_at: 1 })
        expect(res.status).toBe(201)
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 409 on the same name', async () => {
        const res = await tagPost({ name: NAME })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('returns 409 on the same name in another case', async () => {
        const res = await tagPost({ name: NAME.toUpperCase() })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('tag already exists')
    })

    it('returns 409 on a name held by a deleted tag', async () => {
        // The DELETE route is only scaffolding here: what is under test is the POST answer.
        const held = tag_service.getByName(NAME_HELD)
        await tagDelete(held.id)

        const res = await tagPost({ name: NAME_HELD })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag name held by a deleted record')
    })

    it('returns 400 when the name is not a string', async () => {
        const res = await tagPost({ name: 123 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 when the metadata is not a string', async () => {
        const res = await tagPost({ name: `other-${RUN}`, metadata: { color: 'red' } })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 when the body is empty', async () => {
        const res = await tagPost({})
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('tag invalid')
    })
})

describe('GET /api/tag/', () => {
    it('returns 200 with the live tags', async () => {
        const res = await tagGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag retrieved')
        expect(Array.isArray(res.data.data)).toBe(true)
        expect(res.data.data.some((tag) => tag.id === sample.id)).toBe(true)
    })

    it('never lists a deleted tag', async () => {
        const res = await tagGetAll()
        expect(res.data.data.some((tag) => tag.name === NAME_HELD)).toBe(false)
        expect(res.data.data.every((tag) => tag.deleted_at === null)).toBe(true)
    })
})

describe('GET /api/tag/id/:id/', () => {
    it('returns 200 with the tag', async () => {
        const res = await tagGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag retrieved')
        expect(res.data.data).toEqual(sample)
    })

    it('answers the same without the trailing slash', async () => {
        const res = await axios.get(`${URL}/api/tag/id/${sample.id}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.data.id).toBe(sample.id)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await tagGetById(999999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })

    it('returns 404 for a deleted tag, exactly like a missing one', async () => {
        const held = tag_service.getDeletedByName(NAME_HELD)
        const res = await tagGetById(held.id)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('tag not found')
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await tagGetById('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 for zero, a negative and a fraction', async () => {
        for (const id of ['0', '-1', '1.5']) {
            const res = await tagGetById(id)
            expect(res.status).toBe(400)
        }
    })
})

describe('GET /api/tag/name/:name/', () => {
    it('returns 200 with the tag', async () => {
        const res = await tagGetByName(NAME)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag retrieved')
        expect(res.data.data.id).toBe(sample.id)
    })

    it('resolves the same tag in any case and accent shape', async () => {
        const upper = await tagGetByName(NAME.toUpperCase())
        expect(upper.data.data.id).toBe(sample.id)

        const decomposed = await tagGetByName(NAME_ACCENTED.normalize('NFD'))
        expect(decomposed.status).toBe(200)
        expect(decomposed.data.data.name).toBe(NAME_ACCENTED)
    })

    it('returns 404 for a name nobody holds', async () => {
        const res = await tagGetByName(`missing-${RUN}`)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })

    it('returns 404 for a name held by a deleted tag', async () => {
        const res = await tagGetByName(NAME_HELD)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('tag not found')
    })
})

describe('PUT /api/tag/update/', () => {
    it('returns 200 with the stored row', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME, metadata: '{"color":"green"}' })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag updated')
        expect(res.data.data.metadata).toBe('{"color":"green"}')
        expect(res.data.data.id).toBe(sample.id)
    })

    it('stores a renamed tag folded to lower case', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME_RENAMED.toUpperCase(), metadata: '{}' })
        expect(res.status).toBe(200)
        expect(res.data.data.name).toBe(NAME_RENAMED)

        // Put back for the rest of the file.
        await tagUpdate({ id: sample.id, name: NAME, metadata: '{}' })
    })

    it('lets a tag keep its own name in another case', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME.toUpperCase(), metadata: '{}' })
        expect(res.status).toBe(200)
        expect(res.data.data.name).toBe(NAME)
    })

    it('ignores a deleted_at in the body: an update never deletes', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME, metadata: '{}', deleted_at: true })
        expect(res.status).toBe(200)
        expect(res.data.data.deleted_at).toBeNull()
        expect((await tagGetById(sample.id)).status).toBe(200)
    })

    it('returns 409 on a name another live tag holds', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME_DEFAULT_BLOB, metadata: '{}' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('returns 409 on a name held by a deleted tag', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME_HELD, metadata: '{}' })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('tag name held by a deleted record')
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await tagUpdate({ id: 999999999, name: `ghost-${RUN}`, metadata: '{}' })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })

    it('returns 404 for a deleted tag, and leaves it deleted', async () => {
        const held = tag_service.getDeletedByName(NAME_HELD)
        const res = await tagUpdate({ id: held.id, name: NAME_HELD, metadata: '{}' })
        expect(res.status).toBe(404)
        expect(tag_service.getDeletedById(held.id)).not.toBeNull()
    })

    it('returns 400 when the id is missing or not an id', async () => {
        for (const id of [undefined, 'one', 0, 1.5]) {
            const res = await tagUpdate({ id, name: NAME, metadata: '{}' })
            expect(res.status).toBe(400)
            expect(res.data.description).toBe('tag invalid')
        }
    })

    it('returns 400 when the metadata is missing: an update replaces the whole record', async () => {
        const res = await tagUpdate({ id: sample.id, name: NAME })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('tag invalid')
    })
})

describe('DELETE /api/tag/id/:id/', () => {
    // Id of the tag deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live tag and answers its id alone', async () => {
        const created = await tagPost({ name: NAME_TO_DELETE })
        deleted_id = created.data.data.id

        const res = await tagDelete(deleted_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag deleted')
        expect(res.data.data).toBe(deleted_id)

        // Gone for the client, stamped for the backend.
        expect((await tagGetById(deleted_id)).status).toBe(404)
        expect(typeof tag_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a tag already deleted, and keeps its first stamp', async () => {
        const before = tag_service.getDeletedById(deleted_id)

        const res = await tagDelete(deleted_id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
        expect(tag_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 404 for an id nobody holds', async () => {
        const res = await tagDelete(999999999)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('tag not found')
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await tagDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })
})

describe('the guards protect every route', () => {
    // The guard answers before the handler runs, so even a valid request is turned away.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/tag/name/${NAME}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a delete without a session, and the tag survives', async () => {
        const res = await axios.delete(`${URL}/api/tag/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(tag_service.getById(sample.id)).not.toBeNull()
    })
})
