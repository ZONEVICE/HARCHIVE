// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted file — and for the purge.
const file_service = require('./service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  value created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The body of the file most tests below work on.
const SAMPLE = { name: `Photo ${RUN}.JPG`, hash_256_sha: `sha-${RUN}`, relative_path: `/photos/Photo ${RUN}.JPG`, extension: 'JPG' }

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// Ids of every file this suite creates, purged in afterAll whatever state they end in.
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
const fileGetAll = () => axios.get(`${URL}/api/file/`, AS_ADMIN)
const fileGetById = (id) => axios.get(`${URL}/api/file/id/${id}/`, AS_ADMIN)
const filePost = (body) => axios.post(`${URL}/api/file/`, body, AS_ADMIN)
const fileUpdate = (body) => axios.put(`${URL}/api/file/update/`, body, AS_ADMIN)
const fileDelete = (id) => axios.delete(`${URL}/api/file/id/${id}/`, AS_ADMIN)

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created and nothing else: no table is ever emptied.
afterAll(() => {
    for (const id of CREATED_IDS) file_service.hardDelete(id)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/file/', () => {
    it('returns 201 with the stored row', async () => {
        const res = await filePost(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file created')
        expect(typeof res.data.data.id).toBe('number')
        expect(res.data.data).toEqual({ ...SAMPLE, id: res.data.data.id, deleted_at: null })
        sample = res.data.data
        CREATED_IDS.push(sample.id)
    })

    it('stores every value exactly as it arrived: nothing here is an identity key', async () => {
        // The name keeps its capitals and the hash is a byte string nothing may touch.
        expect(sample.name).toBe(SAMPLE.name)
        expect(sample.hash_256_sha).toBe(SAMPLE.hash_256_sha)
        expect(sample.extension).toBe('JPG')
    })

    it('accepts a second file with the same name: two directories may hold one each', async () => {
        const res = await filePost(SAMPLE)
        expect(res.status).toBe(201)
        CREATED_IDS.push(res.data.data.id)
    })

    it('ignores a deleted_at in the body: a file is always born live', async () => {
        const res = await filePost({ ...SAMPLE, deleted_at: 1 })
        expect(res.status).toBe(201)
        expect(res.data.data.deleted_at).toBeNull()
        CREATED_IDS.push(res.data.data.id)
    })

    it('returns 400 when a field has the wrong type', async () => {
        const res = await filePost({ name: `Photo ${RUN}.JPG`, hash_256_sha: 5, relative_path: '/x', extension: 'JPG' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })

    it('returns 400 when the body is empty', async () => {
        const res = await filePost({})
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('file invalid')
    })
})

describe('GET /api/file/', () => {
    it('returns 200 with the live files', async () => {
        const res = await fileGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file retrieved')
        expect(res.data.data.some((row) => row.id === sample.id)).toBe(true)
        expect(res.data.data.every((row) => row.deleted_at === null)).toBe(true)
    })
})

describe('GET /api/file/id/:id/', () => {
    it('returns 200 with the file', async () => {
        const res = await fileGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file retrieved')
        expect(res.data.data).toEqual(sample)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await fileGetById(999999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file not found')
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await fileGetById('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })
})

describe('PUT /api/file/update/', () => {
    it('returns 200 with the stored row', async () => {
        const body = { ...SAMPLE, id: sample.id, name: `Renamed ${RUN}.JPG` }
        const res = await fileUpdate(body)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file updated')
        expect(res.data.data).toEqual({ ...body, deleted_at: null })

        // Put back for the rest of the file.
        await fileUpdate({ ...SAMPLE, id: sample.id })
    })

    it('ignores a deleted_at in the body: an update never deletes', async () => {
        const res = await fileUpdate({ ...SAMPLE, id: sample.id, deleted_at: true })
        expect(res.status).toBe(200)
        expect(res.data.data.deleted_at).toBeNull()
        expect((await fileGetById(sample.id)).status).toBe(200)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await fileUpdate({ ...SAMPLE, id: 999999999 })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file not found')
    })

    it('returns 400 when a field is missing: an update replaces the whole record', async () => {
        const res = await fileUpdate({ id: sample.id, name: `Photo ${RUN}.JPG` })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('file invalid')
    })

    it('returns 400 when the id is not an id', async () => {
        const res = await fileUpdate({ ...SAMPLE, id: String(sample.id) })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('file invalid')
    })
})

describe('DELETE /api/file/id/:id/', () => {
    // Id of the file deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live file and answers its id alone', async () => {
        const created = await filePost({ ...SAMPLE })
        deleted_id = created.data.data.id
        CREATED_IDS.push(deleted_id)

        const res = await fileDelete(deleted_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file deleted')
        expect(res.data.data).toBe(deleted_id)

        // Gone for the client, stamped for the backend.
        expect((await fileGetById(deleted_id)).status).toBe(404)
        expect(typeof file_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a file already deleted, and keeps its first stamp', async () => {
        const before = file_service.getDeletedById(deleted_id)

        const res = await fileDelete(deleted_id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file not found')
        expect(file_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 404 on an update of the deleted file', async () => {
        const res = await fileUpdate({ ...SAMPLE, id: deleted_id })
        expect(res.status).toBe(404)
        expect(file_service.getDeletedById(deleted_id)).not.toBeNull()
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await fileDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('file invalid')
    })
})

describe('the guards protect every route', () => {
    // The guard answers before the handler runs, so even a valid request is turned away.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/file/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a delete without a session, and the file survives', async () => {
        const res = await axios.delete(`${URL}/api/file/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(file_service.getById(sample.id)).not.toBeNull()
    })
})
