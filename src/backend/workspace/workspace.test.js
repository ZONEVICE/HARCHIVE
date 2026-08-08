const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const workspace_repository = require('./repository')
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')

const SAMPLE = { name: 'home', path_absolute: '/home/v/', path_relative: 'v' }

// The axios config every request in this file uses.
//
//  `validateStatus` reads every response as data, never as an exception, so each test asserts
//  the status code itself instead of branching on a thrown error.
//
//  `headers.Cookie` carries the session. Every route of this entity sits behind the
//  `authenticate` middleware, so the suite has to drive it as a logged-in client. The cookie is
//  only known once the server answers a login, so it is filled in by the beforeAll below and
//  every request reads it from here.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// Signs in as the seeded admin and keeps its session cookie for the rest of the file.
const loginAsAdmin = async () => {
    const res = await axios.post(`${URL}/api/user/login/`, {
        username: ADMIN_USERNAME,
        password: ADMIN_DEFAULT_PASSWORD
    })
    AS_ADMIN.headers.Cookie = res.headers['set-cookie'][0].split(';')[0]
}

let created_id = ''

// --------------------------------------------------------------------------------
// One wrapper per route in routes.js.
//
// Only the workspace entity is exercised here. The association of a workspace with the
// rest of the system lives in the relation entity, so those tests live in
// relation/relation.test.js.
// --------------------------------------------------------------------------------
const workspaceGetAll = () => axios.get(`${URL}/api/workspace/`, AS_ADMIN)
const workspaceGetById = (id) => axios.get(`${URL}/api/workspace/id/${id}`, AS_ADMIN)
const workspacePost = (body) => axios.post(`${URL}/api/workspace/`, body, AS_ADMIN)
const workspaceUpdate = (body) => axios.put(`${URL}/api/workspace/update/`, body, AS_ADMIN)
const workspaceDelete = (id) => axios.delete(`${URL}/api/workspace/id/${id}`, AS_ADMIN)

beforeAll(async () => {
    await loginAsAdmin()
    workspace_repository.deleteAll()
})

describe('POST /api/workspace/', () => {
    it('returns 400 warning when name is not a string', async () => {
        const res = await workspacePost({ ...SAMPLE, name: 123 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 400 warning when path_absolute is not a string', async () => {
        const res = await workspacePost({ ...SAMPLE, path_absolute: 123 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 400 warning when path_relative is not a string', async () => {
        const res = await workspacePost({ ...SAMPLE, path_relative: null })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 400 warning when the body is empty', async () => {
        const res = await workspacePost({})
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 201 on valid workspace', async () => {
        const res = await workspacePost(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace created')
    })

    it('returns 409 warning on the exact same path_absolute', async () => {
        const res = await workspacePost({ ...SAMPLE, name: 'home-again' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace already exists')
    })
})

describe('GET /api/workspace/', () => {
    it('returns 200 with a data array', async () => {
        const res = await workspaceGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)

        created_id = res.data.data.find(w => w.path_absolute === SAMPLE.path_absolute).id
        expect(typeof created_id).toBe('number')
    })
})

describe('GET /api/workspace/id/:id', () => {
    it('returns 200 with the workspace when found', async () => {
        const res = await workspaceGetById(created_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
        expect(res.data.data.name).toBe(SAMPLE.name)
        expect(res.data.data.path_absolute).toBe(SAMPLE.path_absolute)
        expect(res.data.data.path_relative).toBe(SAMPLE.path_relative)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await workspaceGetById(999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace not found')
    })
})

describe('PUT /api/workspace/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: created_id, name: 123 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('returns 404 when the workspace does not exist', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: 999999 })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace not found')
    })

    it('returns 200 on valid update', async () => {
        const res = await workspaceUpdate({ ...SAMPLE, id: created_id, name: 'home-renamed' })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace updated')

        const updated = await workspaceGetById(created_id)
        expect(updated.data.data.name).toBe('home-renamed')
    })

    it('returns 409 warning when moving onto a path_absolute another workspace holds', async () => {
        await workspacePost({ name: 'guest', path_absolute: '/home/guest/', path_relative: 'guest' })
        const guest = await workspaceGetAll()
        const guest_id = guest.data.data.find(w => w.path_absolute === '/home/guest/').id

        const res = await workspaceUpdate({ id: guest_id, name: 'guest', path_absolute: SAMPLE.path_absolute, path_relative: 'guest' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace already exists')

        await workspaceDelete(guest_id)
    })
})

describe('PUT /api/workspace/update/ deleted_at', () => {
    const DELETED_SAMPLE = { name: 'trash-workspace', path_absolute: '/home/trash/', path_relative: 'trash' }

    let target_id = ''

    // Builds the full update body the endpoint expects, adding the deleted_at field only
    // when the test explicitly passes one.
    const buildBody = (deleted_at) => {
        const body = { ...DELETED_SAMPLE, id: target_id }
        if (deleted_at !== undefined) body.deleted_at = deleted_at
        return body
    }

    const readWorkspace = async () => {
        const res = await workspaceGetById(target_id)
        return res.data.data
    }

    beforeAll(async () => {
        await workspacePost(DELETED_SAMPLE)
        const list = await workspaceGetAll()
        target_id = list.data.data.find(w => w.path_absolute === DELETED_SAMPLE.path_absolute).id
    })

    it('stores null on a newly created workspace', async () => {
        const workspace = await readWorkspace()
        expect(workspace.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await workspaceUpdate(buildBody(true))
        expect(res.status).toBe(200)

        const workspace = await readWorkspace()
        expect(typeof workspace.deleted_at).toBe('number')
        expect(workspace.deleted_at).toBeGreaterThanOrEqual(before)
        expect(workspace.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted workspaces in the full listing', async () => {
        const res = await workspaceGetAll()
        const workspace = res.data.data.find(w => w.id === target_id)
        expect(workspace).toBeDefined()
        expect(typeof workspace.deleted_at).toBe('number')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readWorkspace()
        const res = await workspaceUpdate(buildBody(undefined))
        expect(res.status).toBe(200)

        const after = await readWorkspace()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await workspaceUpdate(buildBody(false))
        expect(res.status).toBe(200)

        const workspace = await readWorkspace()
        expect(workspace.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await workspaceUpdate(buildBody('yes'))
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace invalid')
    })

    it('keeps the path_absolute taken by a trashed workspace, answering 409 instead of a 500', async () => {
        // Soft-deleted rows still occupy their UNIQUE column, so re-creating the same path
        //  must be a controlled 409, never the UNIQUE constraint surfacing as a 500.
        await workspaceUpdate(buildBody(true))
        const res = await workspacePost(DELETED_SAMPLE)
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('workspace already exists')
    })
})

describe('DELETE /api/workspace/id/:id (soft-delete)', () => {
    it('stamps deleted_at and keeps the workspace readable', async () => {
        // Delete a throwaway workspace so the SAMPLE one stays in the database after the tests.
        await workspacePost({ name: 'throwaway', path_absolute: '/home/throwaway/', path_relative: 'throwaway' })

        const list = await workspaceGetAll()
        const throwaway_id = list.data.data.find(w => w.path_absolute === '/home/throwaway/').id

        const res = await workspaceDelete(throwaway_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('workspace deleted')

        // Soft-deleted: the row stays readable so the client can show it in a trash can.
        const gone = await workspaceGetById(throwaway_id)
        expect(gone.status).toBe(200)
        expect(typeof gone.data.data.deleted_at).toBe('number')

        const after = await workspaceGetAll()
        expect(after.data.data.find(w => w.id === throwaway_id)).toBeDefined()
    })

    it('restores the deleted workspace through the update endpoint', async () => {
        const list = await workspaceGetAll()
        const throwaway = list.data.data.find(w => w.path_absolute === '/home/throwaway/')

        const res = await workspaceUpdate({
            id: throwaway.id,
            name: throwaway.name,
            path_absolute: throwaway.path_absolute,
            path_relative: throwaway.path_relative,
            deleted_at: false
        })
        expect(res.status).toBe(200)

        const restored = await workspaceGetById(throwaway.id)
        expect(restored.data.data.deleted_at).toBeNull()
    })
})

describe('the authenticate middleware guards every route', () => {
    // The guard answers before the handler runs, so the body is never even looked at: a
    //  perfectly valid request without a session is rejected exactly like an invalid one.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/workspace/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a write without a session', async () => {
        const res = await axios.post(`${URL}/api/workspace/`, SAMPLE, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })
})
