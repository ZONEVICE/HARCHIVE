// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted directory — and for the purge.
const directory_service = require('./service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  value created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The body of the directory most tests below work on.
const SAMPLE = { name: `Holidays ${RUN}`, date_scan: 1700000000, date_creation: 1600000000, date_last_modification: 1650000000 }

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// Ids of every directory this suite creates, purged in afterAll whatever state they end in.
const CREATED_IDS = []

// The stored row of SAMPLE, known once POST has created it.
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
const directoryGetAll = () => axios.get(`${URL}/api/directory/`, AS_ADMIN)
const directoryGetById = (id) => axios.get(`${URL}/api/directory/id/${id}/`, AS_ADMIN)
const directoryPost = (body) => axios.post(`${URL}/api/directory/`, body, AS_ADMIN)
const directoryUpdate = (body) => axios.put(`${URL}/api/directory/update/`, body, AS_ADMIN)
const directoryDelete = (id) => axios.delete(`${URL}/api/directory/id/${id}/`, AS_ADMIN)

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created and nothing else: no table is ever emptied.
afterAll(() => {
    for (const id of CREATED_IDS) directory_service.hardDelete(id)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/directory/', () => {
    it('returns 201 with the stored row', async () => {
        const res = await directoryPost(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory created')
        expect(typeof res.data.data.id).toBe('number')
        expect(res.data.data).toEqual({ ...SAMPLE, id: res.data.data.id, deleted_at: null })
        sample = res.data.data
        CREATED_IDS.push(sample.id)
    })

    it('stores the omitted dates as null', async () => {
        const res = await directoryPost({ name: `Unscanned ${RUN}` })
        expect(res.status).toBe(201)
        expect(res.data.data.date_scan).toBeNull()
        expect(res.data.data.date_creation).toBeNull()
        expect(res.data.data.date_last_modification).toBeNull()
        CREATED_IDS.push(res.data.data.id)
    })

    it('accepts an explicit null date', async () => {
        const res = await directoryPost({ name: `Null dates ${RUN}`, date_scan: null })
        expect(res.status).toBe(201)
        expect(res.data.data.date_scan).toBeNull()
        CREATED_IDS.push(res.data.data.id)
    })

    it('ignores a deleted_at in the body: a directory is always born live', async () => {
        const res = await directoryPost({ ...SAMPLE, deleted_at: 1 })
        expect(res.status).toBe(201)
        expect(res.data.data.deleted_at).toBeNull()
        CREATED_IDS.push(res.data.data.id)
    })

    it('returns 400 when a field has the wrong type', async () => {
        const res = await directoryPost({ name: `Holidays ${RUN}`, date_scan: 'yesterday' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 400 when the body is empty', async () => {
        const res = await directoryPost({})
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('directory invalid')
    })
})

describe('GET /api/directory/', () => {
    it('returns 200 with the live directorys', async () => {
        const res = await directoryGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory retrieved')
        expect(res.data.data.some((row) => row.id === sample.id)).toBe(true)
        expect(res.data.data.every((row) => row.deleted_at === null)).toBe(true)
    })
})

describe('GET /api/directory/id/:id/', () => {
    it('returns 200 with the directory', async () => {
        const res = await directoryGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory retrieved')
        expect(res.data.data).toEqual(sample)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await directoryGetById(999999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory not found')
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await directoryGetById('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })
})

describe('PUT /api/directory/update/', () => {
    it('returns 200 with the stored row', async () => {
        const body = { ...SAMPLE, id: sample.id, name: `Renamed ${RUN}`, date_scan: 1710000000 }
        const res = await directoryUpdate(body)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory updated')
        expect(res.data.data).toEqual({ ...body, deleted_at: null })

        // Put back for the rest of the file.
        await directoryUpdate({ ...SAMPLE, id: sample.id })
    })

    it('stores an omitted date as null: an update replaces the whole record', async () => {
        const res = await directoryUpdate({ id: sample.id, name: SAMPLE.name })
        expect(res.status).toBe(200)
        expect(res.data.data.date_scan).toBeNull()

        // Put back for the rest of the file.
        await directoryUpdate({ ...SAMPLE, id: sample.id })
    })

    it('ignores a deleted_at in the body: an update never deletes', async () => {
        const res = await directoryUpdate({ ...SAMPLE, id: sample.id, deleted_at: true })
        expect(res.status).toBe(200)
        expect(res.data.data.deleted_at).toBeNull()
        expect((await directoryGetById(sample.id)).status).toBe(200)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await directoryUpdate({ ...SAMPLE, id: 999999999 })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory not found')
    })

    it('returns 400 when a field is missing: an update replaces the whole record', async () => {
        const res = await directoryUpdate({ id: sample.id, name: 7 })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 400 when the id is not an id', async () => {
        const res = await directoryUpdate({ ...SAMPLE, id: String(sample.id) })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('directory invalid')
    })
})

describe('DELETE /api/directory/id/:id/', () => {
    // Id of the directory deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live directory and answers its id alone', async () => {
        const created = await directoryPost({ ...SAMPLE })
        deleted_id = created.data.data.id
        CREATED_IDS.push(deleted_id)

        const res = await directoryDelete(deleted_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory deleted')
        expect(res.data.data).toBe(deleted_id)

        // Gone for the client, stamped for the backend.
        expect((await directoryGetById(deleted_id)).status).toBe(404)
        expect(typeof directory_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a directory already deleted, and keeps its first stamp', async () => {
        const before = directory_service.getDeletedById(deleted_id)

        const res = await directoryDelete(deleted_id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory not found')
        expect(directory_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 404 on an update of the deleted directory', async () => {
        const res = await directoryUpdate({ ...SAMPLE, id: deleted_id })
        expect(res.status).toBe(404)
        expect(directory_service.getDeletedById(deleted_id)).not.toBeNull()
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await directoryDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('directory invalid')
    })
})

describe('the guards protect every route', () => {
    // The guard answers before the handler runs, so even a valid request is turned away.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/directory/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a delete without a session, and the directory survives', async () => {
        const res = await axios.delete(`${URL}/api/directory/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(directory_service.getById(sample.id)).not.toBeNull()
    })
})
