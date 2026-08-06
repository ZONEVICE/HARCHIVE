const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('./util')
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')

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
//  Note it is the very account this file reads through the API: the admin logs in with the
//  administrator permission attached, which is the only reason these routes answer at all.
const loginAsAdmin = async () => {
    const res = await axios.post(`${URL}/api/user/login/`, {
        username: ADMIN_USERNAME,
        password: ADMIN_DEFAULT_PASSWORD
    })
    AS_ADMIN.headers.Cookie = res.headers['set-cookie'][0].split(';')[0]
}

beforeAll(async () => {
    await loginAsAdmin()
})

// This file deliberately does NOT wipe the permission table, unlike file, tag or directory.
//  The two default rows are seed data created once at startup: deleting them would leave the
//  running server without an administrator until the next restart. The records of this run
//  carry a per-run suffix instead, because the name column is UNIQUE.
const RUN = Date.now()

const SAMPLE = {
    name: `test-permission-${RUN}`,
    entity: null,
    can_read: true,
    can_create: true,
    can_edit: false,
    can_delete: false
}

let created_id = ''

describe('POST /api/permission/', () => {
    it('returns 400 warning when the name is not a string', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { ...SAMPLE, name: 123 }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 warning when a flag is not a boolean', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { ...SAMPLE, can_read: 'yes' }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 201 on valid permission', async () => {
        const res = await axios.post(`${URL}/api/permission/`, SAMPLE, AS_ADMIN)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission created')
    })

    it('returns 409 warning when the name is already taken', async () => {
        const res = await axios.post(`${URL}/api/permission/`, SAMPLE, AS_ADMIN)
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission already exists')
    })

    it('returns 409 warning when the name differs only in case', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { ...SAMPLE, name: SAMPLE.name.toUpperCase() }, AS_ADMIN)
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission already exists')
    })

    it('returns 201 when the flags are omitted, and stores them all as false', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { name: `test-permission-bare-${RUN}` }, AS_ADMIN)
        expect(res.status).toBe(201)

        const bare = await axios.get(`${URL}/api/permission/name/test-permission-bare-${RUN}`, AS_ADMIN)
        expect(bare.data.data.can_read).toBe(false)
        expect(bare.data.data.can_create).toBe(false)
        expect(bare.data.data.can_edit).toBe(false)
        expect(bare.data.data.can_delete).toBe(false)
    })
})

describe('GET /api/permission/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/permission/`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)

        created_id = res.data.data.find(p => p.name === SAMPLE.name).id
        expect(typeof created_id).toBe('number')
    })

    it('lists the two default permissions created at startup', async () => {
        const res = await axios.get(`${URL}/api/permission/`, AS_ADMIN)
        expect(res.data.data.find(p => p.name === ADMINISTRATOR_PERMISSION_NAME)).toBeDefined()
        expect(res.data.data.find(p => p.name === GUEST_PERMISSION_NAME)).toBeDefined()
    })
})

describe('GET /api/permission/id/:id', () => {
    it('returns 200 with the permission when found', async () => {
        const res = await axios.get(`${URL}/api/permission/id/${created_id}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
        expect(res.data.data.name).toBe(SAMPLE.name)
    })

    it('answers the four flags as real booleans, never as 0 and 1', async () => {
        const res = await axios.get(`${URL}/api/permission/id/${created_id}`, AS_ADMIN)
        expect(res.data.data.can_read).toBe(true)
        expect(res.data.data.can_create).toBe(true)
        expect(res.data.data.can_edit).toBe(false)
        expect(res.data.data.can_delete).toBe(false)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/permission/id/nonexistent`, AS_ADMIN)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('permission not found')
    })
})

describe('GET /api/permission/name/:name', () => {
    it('returns 200 with the permission when found', async () => {
        const res = await axios.get(`${URL}/api/permission/name/${SAMPLE.name}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
    })

    it('resolves the same permission whatever the case', async () => {
        const res = await axios.get(`${URL}/api/permission/name/${SAMPLE.name.toUpperCase()}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.data.id).toBe(created_id)
    })

    it('returns 404 when the name does not exist', async () => {
        const res = await axios.get(`${URL}/api/permission/name/not-a-real-permission-${RUN}`, AS_ADMIN)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('permission not found')
    })
})

describe('the default permissions seeded at startup', () => {
    it('grants the administrator all four verbs', async () => {
        const res = await axios.get(`${URL}/api/permission/name/${ADMINISTRATOR_PERMISSION_NAME}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.data.can_read).toBe(true)
        expect(res.data.data.can_create).toBe(true)
        expect(res.data.data.can_edit).toBe(true)
        expect(res.data.data.can_delete).toBe(true)
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('grants the guest reading and nothing else', async () => {
        const res = await axios.get(`${URL}/api/permission/name/${GUEST_PERMISSION_NAME}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.data.can_read).toBe(true)
        expect(res.data.data.can_create).toBe(false)
        expect(res.data.data.can_edit).toBe(false)
        expect(res.data.data.can_delete).toBe(false)
        expect(res.data.data.deleted_at).toBeNull()
    })
})

describe('PUT /api/permission/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, { ...SAMPLE, id: created_id, name: 123 }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 warning when a flag is missing (an update replaces the whole record)', async () => {
        const partial = { id: created_id, name: SAMPLE.name, can_read: true, can_create: true, can_edit: false }
        const res = await axios.put(`${URL}/api/permission/update/`, partial, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 404 when the permission does not exist', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, { ...SAMPLE, id: 999999 }, AS_ADMIN)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('permission not found')
    })

    it('returns 409 warning when the new name belongs to another permission', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, { ...SAMPLE, id: created_id, name: ADMINISTRATOR_PERMISSION_NAME }, AS_ADMIN)
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission already exists')
    })

    it('returns 200 when the permission keeps its own name', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, { ...SAMPLE, id: created_id }, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission updated')
    })

    it('returns 200 on valid update and stores the new flags', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, {
            id: created_id,
            name: `test-permission-renamed-${RUN}`,
            entity: null,
            can_read: true,
            can_create: false,
            can_edit: true,
            can_delete: true
        }, AS_ADMIN)
        expect(res.status).toBe(200)

        const updated = await axios.get(`${URL}/api/permission/id/${created_id}`, AS_ADMIN)
        expect(updated.data.data.name).toBe(`test-permission-renamed-${RUN}`)
        expect(updated.data.data.can_read).toBe(true)
        expect(updated.data.data.can_create).toBe(false)
        expect(updated.data.data.can_edit).toBe(true)
        expect(updated.data.data.can_delete).toBe(true)
    })
})

describe('PUT /api/permission/update/ deleted_at', () => {
    const DELETED_SAMPLE = {
        name: `trash-permission-${RUN}`,
        entity: null,
        can_read: true,
        can_create: false,
        can_edit: false,
        can_delete: false
    }

    let target_id = ''

    // Builds the full update body the endpoint expects, adding the deleted_at field only
    //  when the test explicitly passes one.
    const buildBody = (deleted_at) => {
        const body = { ...DELETED_SAMPLE, id: target_id }
        if (deleted_at !== undefined) body.deleted_at = deleted_at
        return body
    }

    const readPermission = async () => {
        const res = await axios.get(`${URL}/api/permission/id/${target_id}`, AS_ADMIN)
        return res.data.data
    }

    beforeAll(async () => {
        await axios.post(`${URL}/api/permission/`, DELETED_SAMPLE, AS_ADMIN)
        const created = await axios.get(`${URL}/api/permission/name/${DELETED_SAMPLE.name}`, AS_ADMIN)
        target_id = created.data.data.id
    })

    it('stores null on a newly created permission', async () => {
        const permission = await readPermission()
        expect(permission.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await axios.put(`${URL}/api/permission/update/`, buildBody(true), AS_ADMIN)
        expect(res.status).toBe(200)

        const permission = await readPermission()
        expect(typeof permission.deleted_at).toBe('number')
        expect(permission.deleted_at).toBeGreaterThanOrEqual(before)
        expect(permission.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted permissions in the full listing', async () => {
        const res = await axios.get(`${URL}/api/permission/`, AS_ADMIN)
        const permission = res.data.data.find(p => p.id === target_id)
        expect(permission).toBeDefined()
        expect(typeof permission.deleted_at).toBe('number')
    })

    it('still resolves a deleted permission by name', async () => {
        const res = await axios.get(`${URL}/api/permission/name/${DELETED_SAMPLE.name}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(typeof res.data.data.deleted_at).toBe('number')
    })

    it('keeps holding its UNIQUE name while it sits in the trash', async () => {
        const res = await axios.post(`${URL}/api/permission/`, DELETED_SAMPLE, AS_ADMIN)
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission already exists')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readPermission()
        const res = await axios.put(`${URL}/api/permission/update/`, buildBody(undefined), AS_ADMIN)
        expect(res.status).toBe(200)

        const after = await readPermission()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, buildBody(false), AS_ADMIN)
        expect(res.status).toBe(200)

        const permission = await readPermission()
        expect(permission.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, buildBody('yes'), AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })
})

describe('DELETE /api/permission/id/:id (soft-delete)', () => {
    let throwaway_id = ''

    it('stamps deleted_at and keeps the permission readable', async () => {
        await axios.post(`${URL}/api/permission/`, { name: `throwaway-permission-${RUN}`, can_read: true }, AS_ADMIN)

        const created = await axios.get(`${URL}/api/permission/name/throwaway-permission-${RUN}`, AS_ADMIN)
        throwaway_id = created.data.data.id

        const res = await axios.delete(`${URL}/api/permission/id/${throwaway_id}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission deleted')

        // Soft-deleted: the row stays readable so the client can show it in a trash can.
        const gone = await axios.get(`${URL}/api/permission/id/${throwaway_id}`, AS_ADMIN)
        expect(gone.status).toBe(200)
        expect(typeof gone.data.data.deleted_at).toBe('number')

        const after = await axios.get(`${URL}/api/permission/`, AS_ADMIN)
        expect(after.data.data.find(p => p.id === throwaway_id)).toBeDefined()
    })

    it('restores the deleted permission through the update endpoint', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, {
            id: throwaway_id,
            name: `throwaway-permission-${RUN}`,
            entity: null,
            can_read: true,
            can_create: false,
            can_edit: false,
            can_delete: false,
            deleted_at: false
        }, AS_ADMIN)
        expect(res.status).toBe(200)

        const restored = await axios.get(`${URL}/api/permission/id/${throwaway_id}`, AS_ADMIN)
        expect(restored.data.data.deleted_at).toBeNull()
    })
})

describe('the authenticate middleware guards every route', () => {
    // The guard answers before the handler runs, so the body is never even looked at: a
    //  perfectly valid request without a session is rejected exactly like an invalid one.
    //  Note this is the entity that answers "what may this user do?", so leaving it open would
    //  let anyone read the roles and grant themselves any of them.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/permission/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a write without a session', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { name: `unauthenticated-${RUN}` }, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })
})

describe('the entity column — what a permission is scoped to', () => {
    const SCOPED = {
        name: `test-permission-scoped-${RUN}`,
        entity: 'tag',
        can_read: true,
        can_create: true,
        can_edit: true,
        can_delete: true
    }

    let scoped_id = ''

    it('returns 201 and stores the entity a permission is scoped to', async () => {
        const res = await axios.post(`${URL}/api/permission/`, SCOPED, AS_ADMIN)
        expect(res.status).toBe(201)

        const created = await axios.get(`${URL}/api/permission/name/${SCOPED.name}`, AS_ADMIN)
        expect(created.data.data.entity).toBe('tag')

        scoped_id = created.data.data.id
        expect(typeof scoped_id).toBe('number')
    })

    it('stores null when the client omits the entity, so the permission applies to all', async () => {
        // The widest scope is the default, which is only safe because the four flags default to
        //  false: the resulting permission reaches every entity and grants nothing.
        const res = await axios.post(`${URL}/api/permission/`, { name: `test-permission-unscoped-${RUN}` }, AS_ADMIN)
        expect(res.status).toBe(201)

        const created = await axios.get(`${URL}/api/permission/name/test-permission-unscoped-${RUN}`, AS_ADMIN)
        expect(created.data.data.entity).toBeNull()
    })

    it('returns 400 warning when the entity is not one of SYSTEM_ENTITIES', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { ...SCOPED, name: `test-permission-bad-${RUN}`, entity: 'not-a-real-entity' }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 warning when the entity is not a string and not null', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { ...SCOPED, name: `test-permission-bad2-${RUN}`, entity: 3 }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 warning when an update leaves the entity out', async () => {
        // This is the rule that keeps the column from being an escalation of its own: an update
        //  replaces the whole record, so an omitted entity would silently widen a permission
        //  scoped to one entity into a permission over every one of them.
        const body = { id: scoped_id, name: SCOPED.name, can_read: true, can_create: true, can_edit: true, can_delete: true }
        const res = await axios.put(`${URL}/api/permission/update/`, body, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 warning when an update sends an entity outside the catalogue', async () => {
        const body = { ...SCOPED, id: scoped_id, entity: 'not-a-real-entity' }
        const res = await axios.put(`${URL}/api/permission/update/`, body, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('re-scopes a permission to another entity through the update endpoint', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, { ...SCOPED, id: scoped_id, entity: 'file' }, AS_ADMIN)
        expect(res.status).toBe(200)

        const updated = await axios.get(`${URL}/api/permission/id/${scoped_id}`, AS_ADMIN)
        expect(updated.data.data.entity).toBe('file')
    })

    it('widens a permission to every entity by sending entity null explicitly', async () => {
        const res = await axios.put(`${URL}/api/permission/update/`, { ...SCOPED, id: scoped_id, entity: null }, AS_ADMIN)
        expect(res.status).toBe(200)

        const updated = await axios.get(`${URL}/api/permission/id/${scoped_id}`, AS_ADMIN)
        expect(updated.data.data.entity).toBeNull()
    })

    it('returns the entity described by the permission table and nothing else', async () => {
        // Guard on the shape of the row: this fails the moment a column is added, removed or
        //  renamed in the permission schema, which is the reminder to update the rest of the entity.
        const res = await axios.get(`${URL}/api/permission/id/${scoped_id}`, AS_ADMIN)
        expect(Object.keys(res.data.data).sort()).toEqual(
            ['can_create', 'can_delete', 'can_edit', 'can_read', 'deleted_at', 'entity', 'id', 'name']
        )
    })
})
