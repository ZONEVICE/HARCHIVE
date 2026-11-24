// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted record — and for the purge.
const metadata_service = require('./service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  name created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The names this suite creates, purged in afterAll whatever state they end in.
const NAME = `site-name-${RUN}`
const NAME_OTHER = `site-theme-${RUN}`
const NAME_HELD = `held-${RUN}`
const NAME_TO_DELETE = `to-delete-${RUN}`
const NAME_RENAMED = `renamed-${RUN}`
const CREATED_NAMES = [NAME, NAME_OTHER, NAME_HELD, NAME_TO_DELETE, NAME_RENAMED]

// A value whose bytes are the datum: capitals, accents and markup, stored exactly as sent.
const VALUE_RAW = '<h1>Árchivo DE Víctor</h1>'

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guards.
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
const metadataGetAll = () => axios.get(`${URL}/api/metadata/`, AS_ADMIN)
const metadataGetById = (id) => axios.get(`${URL}/api/metadata/id/${id}/`, AS_ADMIN)
const metadataGetByName = (name) => axios.get(`${URL}/api/metadata/name/${encodeURIComponent(name)}/`, AS_ADMIN)
const metadataPost = (body) => axios.post(`${URL}/api/metadata/`, body, AS_ADMIN)
const metadataUpdate = (body) => axios.put(`${URL}/api/metadata/update/`, body, AS_ADMIN)
const metadataDelete = (name) => axios.delete(`${URL}/api/metadata/name/${encodeURIComponent(name)}/`, AS_ADMIN)

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created and nothing else. The purge is keyed on the name, like the
//  whole delete family of this entity, and removes live and deleted rows alike.
afterAll(() => {
    for (const name of CREATED_NAMES) metadata_service.hardDeleteByName(name)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/metadata/', () => {
    it('returns 201 with the stored row', async () => {
        const res = await metadataPost({ name: NAME, value: 'Archive' })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata created')
        expect(typeof res.data.data.id).toBe('number')
        expect(res.data.data.name).toBe(NAME)
        expect(res.data.data.value).toBe('Archive')
        expect(res.data.data.deleted_at).toBeNull()
        sample = res.data.data
    })

    it('stores the value exactly as it arrived, and only the name folded', async () => {
        const res = await metadataPost({ name: `  ${NAME_OTHER.toUpperCase()}  `, value: VALUE_RAW })
        expect(res.status).toBe(201)
        expect(res.data.data.name).toBe(NAME_OTHER)
        expect(res.data.data.value).toBe(VALUE_RAW)
    })

    it('returns 409 on the same name in another case', async () => {
        const res = await metadataPost({ name: NAME.toUpperCase(), value: 'x' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata already exists')
    })

    it('returns 409 on a name held by a deleted record', async () => {
        // The DELETE route is only scaffolding here: what is under test is the POST answer.
        await metadataPost({ name: NAME_HELD, value: 'x' })
        await metadataDelete(NAME_HELD)

        const res = await metadataPost({ name: NAME_HELD, value: 'x' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata name held by a deleted record')
    })

    it('returns 400 when the value is missing: a record is its value', async () => {
        const res = await metadataPost({ name: `no-value-${RUN}` })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata invalid')
    })

    it('returns 400 when the name is not a string', async () => {
        const res = await metadataPost({ name: 5, value: 'x' })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('metadata invalid')
    })
})

describe('GET /api/metadata/', () => {
    it('returns 200 with the live records and no deleted one', async () => {
        const res = await metadataGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata retrieved')
        expect(res.data.data.some((row) => row.id === sample.id)).toBe(true)
        expect(res.data.data.some((row) => row.name === NAME_HELD)).toBe(false)
    })
})

describe('GET /api/metadata/id/:id/', () => {
    it('returns 200 with the record', async () => {
        const res = await metadataGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.description).toBe('metadata retrieved')
        expect(res.data.data).toEqual(sample)
    })

    it('returns 404 for a deleted record, exactly like a missing one', async () => {
        const held = metadata_service.getDeletedByName(NAME_HELD)
        const res = await metadataGetById(held.id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata not found')
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await metadataGetById(999999999)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('metadata not found')
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await metadataGetById('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('metadata invalid')
    })
})

describe('GET /api/metadata/name/:name/', () => {
    it('returns 200 with the record, in any case', async () => {
        const res = await metadataGetByName(NAME.toUpperCase())
        expect(res.status).toBe(200)
        expect(res.data.description).toBe('metadata retrieved')
        expect(res.data.data.id).toBe(sample.id)
    })

    it('returns 404 for a deleted record', async () => {
        const res = await metadataGetByName(NAME_HELD)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('metadata not found')
    })
})

describe('PUT /api/metadata/update/', () => {
    it('returns 200 with the stored row', async () => {
        const res = await metadataUpdate({ id: sample.id, name: NAME, value: 'Renamed archive' })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata updated')
        expect(res.data.data.value).toBe('Renamed archive')
    })

    it('stores a renamed record folded to lower case', async () => {
        const res = await metadataUpdate({ id: sample.id, name: NAME_RENAMED.toUpperCase(), value: 'x' })
        expect(res.status).toBe(200)
        expect(res.data.data.name).toBe(NAME_RENAMED)

        // Put back for the rest of the file.
        await metadataUpdate({ id: sample.id, name: NAME, value: 'Archive' })
    })

    it('ignores a deleted_at in the body: an update never deletes', async () => {
        const res = await metadataUpdate({ id: sample.id, name: NAME, value: 'Archive', deleted_at: true })
        expect(res.status).toBe(200)
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 409 on a name another live record holds', async () => {
        const res = await metadataUpdate({ id: sample.id, name: NAME_OTHER, value: 'x' })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('metadata already exists')
    })

    it('returns 409 on a name held by a deleted record', async () => {
        const res = await metadataUpdate({ id: sample.id, name: NAME_HELD, value: 'x' })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('metadata name held by a deleted record')
    })

    it('returns 404 for a deleted record', async () => {
        const held = metadata_service.getDeletedByName(NAME_HELD)
        const res = await metadataUpdate({ id: held.id, name: NAME_HELD, value: 'x' })
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('metadata not found')
    })

    it('returns 400 when the value is not a string', async () => {
        const res = await metadataUpdate({ id: sample.id, name: NAME, value: 42 })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('metadata invalid')
    })

    it('returns 400 when the id is not an id', async () => {
        const res = await metadataUpdate({ id: '1', name: NAME, value: 'x' })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('metadata invalid')
    })
})

describe('DELETE /api/metadata/name/:name/', () => {
    // Id of the record deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live record by name, in any case, and answers its id alone', async () => {
        const created = await metadataPost({ name: NAME_TO_DELETE, value: 'x' })
        deleted_id = created.data.data.id

        const res = await metadataDelete(NAME_TO_DELETE.toUpperCase())
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata deleted')
        expect(res.data.data).toBe(deleted_id)

        // Gone for the client, stamped for the backend.
        expect((await metadataGetByName(NAME_TO_DELETE)).status).toBe(404)
        expect(typeof metadata_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a record already deleted, and keeps its first stamp', async () => {
        const before = metadata_service.getDeletedById(deleted_id)

        const res = await metadataDelete(NAME_TO_DELETE)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata not found')
        expect(metadata_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 404 for a name nobody holds', async () => {
        const res = await metadataDelete(`missing-${RUN}`)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('metadata not found')
    })
})

describe('the guards protect the writes, not the reads', () => {
    it('lets an anonymous client list the records', async () => {
        const res = await axios.get(`${URL}/api/metadata/`, ANONYMOUS)
        expect(res.status).toBe(200)
    })

    it('lets an anonymous client read one record by id', async () => {
        const res = await axios.get(`${URL}/api/metadata/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(200)
        expect(res.data.data.id).toBe(sample.id)
    })

    it('lets an anonymous client read one record by name', async () => {
        const res = await axios.get(`${URL}/api/metadata/name/${NAME}/`, ANONYMOUS)
        expect(res.status).toBe(200)
        expect(res.data.data.name).toBe(NAME)
    })

    it('answers 401 on a create without a session', async () => {
        const res = await axios.post(`${URL}/api/metadata/`, { name: `anonymous-${RUN}`, value: 'x' }, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on an update without a session', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, { id: sample.id, name: NAME, value: 'x' }, ANONYMOUS)
        expect(res.status).toBe(401)
    })

    it('answers 401 on a delete without a session, and the record survives', async () => {
        const res = await axios.delete(`${URL}/api/metadata/name/${NAME}/`, ANONYMOUS)
        expect(res.status).toBe(401)

        // The guard runs before the handler, so nothing was deleted.
        expect((await axios.get(`${URL}/api/metadata/name/${NAME}/`, ANONYMOUS)).status).toBe(200)
    })
})
