// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted workspace — and for the purge.
const workspace_service = require('./service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  value created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The body of the workspace most tests below work on.
const SAMPLE = { name: `Home ${RUN}`, path_absolute: `/home/v/${RUN}/`, path_relative: `v/${RUN}/` }

// A path this suite deletes, to prove a deleted workspace still holds it.
const PATH_HELD = `/home/held/${RUN}/`

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// Ids of every workspace this suite creates, purged in afterAll whatever state they end in.
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
const workspaceGetAll = () => axios.get(`${URL}/api/workspace/`, AS_ADMIN)
const workspaceGetById = (id) => axios.get(`${URL}/api/workspace/id/${id}/`, AS_ADMIN)
const workspacePost = (body) => axios.post(`${URL}/api/workspace/`, body, AS_ADMIN)
const workspaceUpdate = (body) => axios.put(`${URL}/api/workspace/update/`, body, AS_ADMIN)
const workspaceDelete = (id) => axios.delete(`${URL}/api/workspace/id/${id}/`, AS_ADMIN)

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created and nothing else: no table is ever emptied.
afterAll(() => {
    for (const id of CREATED_IDS) workspace_service.hardDelete(id)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/workspace/', () => {
    it('returns 201 with the stored row', async () => {
        const res = await workspacePost(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace created')
        expect(typeof res.data.data.id).toBe('number')
        expect(res.data.data).toEqual({ ...SAMPLE, id: res.data.data.id, deleted_at: null })
        sample = res.data.data
        CREATED_IDS.push(sample.id)
    })

    it('keeps the case of the path: /home/V/ is not /home/v/', async () => {
        const res = await workspacePost({ name: `Upper ${RUN}`, path_absolute: `/home/V/${RUN}/`, path_relative: 'V/' })
        expect(res.status).toBe(201)
        expect(res.data.data.path_absolute).toBe(`/home/V/${RUN}/`)
        CREATED_IDS.push(res.data.data.id)
    })

    it('trims and composes the path before storing it', async () => {
        const path_decomposed = `/home/josé/${RUN}/`.normalize('NFD')
        const res = await workspacePost({ name: `Accent ${RUN}`, path_absolute: `  ${path_decomposed}  `, path_relative: 'x' })
        expect(res.status).toBe(201)
        expect(res.data.data.path_absolute).toBe(`/home/josé/${RUN}/`.normalize('NFC'))
        CREATED_IDS.push(res.data.data.id)
    })

    it('returns 409 on the same path', async () => {
        const res = await workspacePost({ ...SAMPLE, name: 'another name' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace already exists')
    })

    it('returns 409 on a path held by a deleted workspace', async () => {
        // The DELETE route is only scaffolding here: what is under test is the POST answer.
        const held = await workspacePost({ name: `Held ${RUN}`, path_absolute: PATH_HELD, path_relative: 'held/' })
        CREATED_IDS.push(held.data.data.id)
        await workspaceDelete(held.data.data.id)

        const res = await workspacePost({ name: `Held again ${RUN}`, path_absolute: PATH_HELD, path_relative: 'held/' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace path held by a deleted record')
    })

    it('ignores a deleted_at in the body: a workspace is always born live', async () => {
        const res = await workspacePost({ ...SAMPLE, path_absolute: `/home/born-live/${RUN}/`, deleted_at: 1 })
        expect(res.status).toBe(201)
        expect(res.data.data.deleted_at).toBeNull()
        CREATED_IDS.push(res.data.data.id)
    })

    it('returns 400 when a field has the wrong type', async () => {
        const res = await workspacePost({ name: `Home ${RUN}`, path_absolute: 5, path_relative: 'x' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 400 when the body is empty', async () => {
        const res = await workspacePost({})
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('workspace invalid')
    })
})

describe('GET /api/workspace/', () => {
    it('returns 200 with the live workspaces', async () => {
        const res = await workspaceGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace retrieved')
        expect(res.data.data.some((row) => row.id === sample.id)).toBe(true)
        expect(res.data.data.every((row) => row.deleted_at === null)).toBe(true)
    })
})

describe('GET /api/workspace/id/:id/', () => {
    it('returns 200 with the workspace', async () => {
        const res = await workspaceGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace retrieved')
        expect(res.data.data).toEqual(sample)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await workspaceGetById(999999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace not found')
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await workspaceGetById('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })
})

describe('PUT /api/workspace/update/', () => {
    it('returns 200 with the stored row', async () => {
        const body = { ...SAMPLE, id: sample.id, name: `Renamed ${RUN}` }
        const res = await workspaceUpdate(body)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace updated')
        expect(res.data.data).toEqual({ ...body, deleted_at: null })

        // Put back for the rest of the file.
        await workspaceUpdate({ ...SAMPLE, id: sample.id })
    })

    it('returns 409 when moving onto a path another live workspace holds', async () => {
        const other = await workspacePost({ name: `Other ${RUN}`, path_absolute: `/home/other/${RUN}/`, path_relative: 'other/' })
        CREATED_IDS.push(other.data.data.id)

        const res = await workspaceUpdate({ ...SAMPLE, id: sample.id, path_absolute: `/home/other/${RUN}/` })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('workspace already exists')
    })

    it('returns 409 when moving onto a path a deleted workspace holds', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: sample.id, path_absolute: PATH_HELD })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('workspace path held by a deleted record')
    })

    it('ignores a deleted_at in the body: an update never deletes', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: sample.id, deleted_at: true })
        expect(res.status).toBe(200)
        expect(res.data.data.deleted_at).toBeNull()
        expect((await workspaceGetById(sample.id)).status).toBe(200)
    })

    it('returns 404 for an id nobody holds', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: 999999999 })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace not found')
    })

    it('returns 400 when a field is missing: an update replaces the whole record', async () => {
        const res = await workspaceUpdate({ id: sample.id, name: `Home ${RUN}`, path_absolute: `/home/v/${RUN}/` })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 400 when the id is not an id', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: String(sample.id) })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('workspace invalid')
    })
})

describe('DELETE /api/workspace/id/:id/', () => {
    // Id of the workspace deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live workspace and answers its id alone', async () => {
        const created = await workspacePost({ ...SAMPLE, path_absolute: `/home/to-delete/${RUN}/` })
        deleted_id = created.data.data.id
        CREATED_IDS.push(deleted_id)

        const res = await workspaceDelete(deleted_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace deleted')
        expect(res.data.data).toBe(deleted_id)

        // Gone for the client, stamped for the backend.
        expect((await workspaceGetById(deleted_id)).status).toBe(404)
        expect(typeof workspace_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a workspace already deleted, and keeps its first stamp', async () => {
        const before = workspace_service.getDeletedById(deleted_id)

        const res = await workspaceDelete(deleted_id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace not found')
        expect(workspace_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 404 on an update of the deleted workspace', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: deleted_id })
        expect(res.status).toBe(404)
        expect(workspace_service.getDeletedById(deleted_id)).not.toBeNull()
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await workspaceDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('workspace invalid')
    })
})

describe('the guards protect every route', () => {
    // The guard answers before the handler runs, so even a valid request is turned away.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/workspace/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a delete without a session, and the workspace survives', async () => {
        const res = await axios.delete(`${URL}/api/workspace/id/${sample.id}/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(workspace_service.getById(sample.id)).not.toBeNull()
    })
})
