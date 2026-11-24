// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, for what the client cannot see — a deleted permission — and for the purge.
const permission_service = require('./service')

// The names of the two seeded roles, which this suite reads and never changes.
const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('./util')

// The entities the authorization block needs as scaffolding: a second account, and the links
//  that hand it its rights. Both are reached through their services.
const user_service = require('../user/service')
const relation_service = require('../relation/service')

// The seeded account the suite signs in with.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so every
//  name created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The body of the permission most tests below work on.
const SAMPLE = { name: `editor-${RUN}`, entity: 'tag', can_read: true, can_create: true, can_edit: true, can_delete: false }

// The names this suite creates besides SAMPLE's.
const NAME_GLOBAL = `global-${RUN}`
const NAME_HELD = `held-${RUN}`
const NAME_TO_DELETE = `to-delete-${RUN}`

// =====================================================================================
// STATE.
// =====================================================================================

// The axios config every signed-in request uses. validateStatus reads every response as data,
//  never as an exception, so each test asserts the status code itself. The session cookie is
//  only known after the sign-in in beforeAll.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// Ids of every permission, relation and user this suite creates, purged in afterAll.
const CREATED_PERMISSION_IDS = []
const CREATED_RELATION_IDS = []
const CREATED_USER_IDS = []

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
const permissionGetAll = () => axios.get(`${URL}/api/permission/`, AS_ADMIN)
const permissionGetById = (id) => axios.get(`${URL}/api/permission/id/${id}/`, AS_ADMIN)
const permissionGetByName = (name) => axios.get(`${URL}/api/permission/name/${encodeURIComponent(name)}/`, AS_ADMIN)
const permissionPost = (body) => axios.post(`${URL}/api/permission/`, body, AS_ADMIN)
const permissionUpdate = (body) => axios.put(`${URL}/api/permission/update/`, body, AS_ADMIN)
const permissionDelete = (id) => axios.delete(`${URL}/api/permission/id/${id}/`, AS_ADMIN)

// Creates a permission over HTTP, remembers it for the purge and answers the response.
const createPermission = async (body) => {
    const res = await permissionPost(body)
    if (res.status === 201) CREATED_PERMISSION_IDS.push(res.data.data.id)
    return res
}

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

beforeAll(async () => {
    await loginAsAdmin()
})

// Purges what this suite created, links first, and nothing else. The two seeded roles are
//  only ever read here: deleting them would leave the running server without an
//  administrator until the next boot.
afterAll(() => {
    for (const id of CREATED_RELATION_IDS) relation_service.hardDelete(id)
    for (const id of CREATED_PERMISSION_IDS) permission_service.hardDelete(id)
    for (const id of CREATED_USER_IDS) user_service.hardDelete(id)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/permission/', () => {
    it('returns 201 with the stored row, flags as real booleans', async () => {
        const res = await createPermission(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission created')
        expect(res.data.data).toEqual({ ...SAMPLE, id: res.data.data.id, deleted_at: null })
        sample = res.data.data
    })

    it('stores null and four false flags when only the name is sent', async () => {
        // The widest scope is the default, which is only safe because the four flags default to
        //  false: the resulting permission reaches every entity and grants nothing.
        const res = await createPermission({ name: NAME_GLOBAL })
        expect(res.status).toBe(201)
        expect(res.data.data.entity).toBeNull()
        expect(res.data.data.can_read).toBe(false)
        expect(res.data.data.can_create).toBe(false)
        expect(res.data.data.can_edit).toBe(false)
        expect(res.data.data.can_delete).toBe(false)
    })

    it('returns 409 on the same name in another case', async () => {
        const res = await permissionPost({ name: SAMPLE.name.toUpperCase() })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission already exists')
    })

    it('returns 409 on a name held by a deleted permission', async () => {
        // The DELETE route is only scaffolding here: what is under test is the POST answer.
        const held = await createPermission({ name: NAME_HELD })
        await permissionDelete(held.data.data.id)

        const res = await permissionPost({ name: NAME_HELD })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('permission name held by a deleted record')
    })

    it('returns 400 when the entity is in no catalogue', async () => {
        const res = await permissionPost({ ...SAMPLE, name: `bad-scope-${RUN}`, entity: 'not-a-real-entity' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 when the entity is neither a name nor null', async () => {
        const res = await permissionPost({ ...SAMPLE, name: `bad-scope-${RUN}`, entity: 3 })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 when a flag is a truthy string instead of a boolean', async () => {
        const res = await permissionPost({ name: `bad-flag-${RUN}`, can_read: 'true' })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('permission invalid')
    })
})

describe('GET /api/permission/', () => {
    it('returns 200 with the live permissions, the two seeded roles among them', async () => {
        const res = await permissionGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission retrieved')

        const names = res.data.data.map((permission) => permission.name)
        expect(names).toContain(ADMINISTRATOR_PERMISSION_NAME)
        expect(names).toContain(GUEST_PERMISSION_NAME)
        expect(names).not.toContain(NAME_HELD)
    })
})

describe('GET /api/permission/id/:id/', () => {
    it('returns 200 with the permission, and exactly the columns of its table', async () => {
        const res = await permissionGetById(sample.id)
        expect(res.status).toBe(200)
        expect(res.data.description).toBe('permission retrieved')
        expect(res.data.data).toEqual(sample)

        // Fails the moment a column is added, removed or renamed in the permission schema,
        //  which is the reminder to update the rest of the entity.
        expect(Object.keys(res.data.data).sort()).toEqual(
            ['can_create', 'can_delete', 'can_edit', 'can_read', 'deleted_at', 'entity', 'id', 'name']
        )
    })

    it('returns 404 for a deleted permission, exactly like a missing one', async () => {
        const held = permission_service.getDeletedByName(NAME_HELD)
        const res = await permissionGetById(held.id)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('permission not found')
    })

    it('returns 400 for an id that is not a number', async () => {
        const res = await permissionGetById('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('permission invalid')
    })
})

describe('GET /api/permission/name/:name/', () => {
    it('returns 200 with each seeded role, as seeded', async () => {
        const administrator = await permissionGetByName(ADMINISTRATOR_PERMISSION_NAME)
        expect(administrator.status).toBe(200)
        expect(administrator.data.data.entity).toBeNull()
        expect(administrator.data.data.can_delete).toBe(true)

        const guest = await permissionGetByName(GUEST_PERMISSION_NAME.toUpperCase())
        expect(guest.status).toBe(200)
        expect(guest.data.data.can_read).toBe(true)
        expect(guest.data.data.can_create).toBe(false)
    })

    it('returns 404 for a name held by a deleted permission', async () => {
        const res = await permissionGetByName(NAME_HELD)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('permission not found')
    })
})

describe('PUT /api/permission/update/', () => {
    it('returns 200 with the stored row', async () => {
        const res = await permissionUpdate({ ...SAMPLE, id: sample.id, can_delete: true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission updated')
        expect(res.data.data.can_delete).toBe(true)
    })

    it('re-scopes a permission to another entity', async () => {
        const res = await permissionUpdate({ ...SAMPLE, id: sample.id, entity: 'file' })
        expect(res.status).toBe(200)
        expect(res.data.data.entity).toBe('file')
    })

    it('widens a permission to every entity only when entity: null is sent explicitly', async () => {
        const res = await permissionUpdate({ ...SAMPLE, id: sample.id, entity: null })
        expect(res.status).toBe(200)
        expect(res.data.data.entity).toBeNull()

        // Put back for the rest of the file.
        await permissionUpdate({ ...SAMPLE, id: sample.id })
    })

    it('returns 400 when the entity is left out', async () => {
        // An update replaces the whole record, so an omitted entity would silently widen a
        //  permission scoped to one entity into a permission over every one of them.
        const { entity, ...without_entity } = SAMPLE
        const res = await permissionUpdate({ ...without_entity, id: sample.id })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 400 when a flag is left out', async () => {
        const { can_read, ...without_flag } = SAMPLE
        const res = await permissionUpdate({ ...without_flag, id: sample.id })
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('permission invalid')
    })

    it('returns 409 on a name another live permission holds', async () => {
        const res = await permissionUpdate({ ...SAMPLE, id: sample.id, name: GUEST_PERMISSION_NAME })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('permission already exists')
    })

    it('returns 409 on a name held by a deleted permission', async () => {
        const res = await permissionUpdate({ ...SAMPLE, id: sample.id, name: NAME_HELD })
        expect(res.status).toBe(409)
        expect(res.data.description).toBe('permission name held by a deleted record')
    })

    it('returns 404 for a deleted permission', async () => {
        const held = permission_service.getDeletedByName(NAME_HELD)
        const res = await permissionUpdate({ ...SAMPLE, id: held.id, name: NAME_HELD })
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('permission not found')
    })
})

describe('DELETE /api/permission/id/:id/', () => {
    // Id of the permission deleted by the first test, read by the ones after it.
    let deleted_id = null

    it('deletes a live permission and answers its id alone', async () => {
        const created = await createPermission({ name: NAME_TO_DELETE })
        deleted_id = created.data.data.id

        const res = await permissionDelete(deleted_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('permission deleted')
        expect(res.data.data).toBe(deleted_id)
        expect(typeof permission_service.getDeletedById(deleted_id).deleted_at).toBe('number')
    })

    it('answers 404 on a permission already deleted, and keeps its first stamp', async () => {
        const before = permission_service.getDeletedById(deleted_id)

        const res = await permissionDelete(deleted_id)
        expect(res.status).toBe(404)
        expect(res.data.description).toBe('permission not found')
        expect(permission_service.getDeletedById(deleted_id).deleted_at).toBe(before.deleted_at)
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await permissionDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.description).toBe('permission invalid')
    })
})

describe('the guards protect every route', () => {
    // Every route is guarded, reads included: this is the entity that answers "what may this
    //  user do?".
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/permission/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a write without a session', async () => {
        const res = await axios.post(`${URL}/api/permission/`, { name: `anonymous-${RUN}` }, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
    })
})

// =====================================================================================
// AUTHORIZATION OVER HTTP.
//
//  permission/service.test.js proves the resolution rules of can() directly. This block
//  proves they are *wired*: it drives the real routes as a real second account whose rights
//  change underneath it. It lives here because the answer under test is the one this
//  entity's service computes; the links are only scaffolding.
// =====================================================================================

describe('authorize — what a user may do, entity by entity', () => {
    // The weak account, and its own session: same shape as AS_ADMIN, a different user inside.
    const WEAK_USERNAME = `weak-user-${RUN}`
    const WEAK_PASSWORD = 'weak-password'
    const AS_WEAK = { validateStatus: () => true, headers: {} }

    // Id of the weak account.
    let weak_user_id = null

    // Id of the global permission the weak user is given halfway through.
    let global_reader_id = null

    // Creates a permission as the admin and grants it to the weak user with a `linked` relation.
    const grantToWeakUser = async (body) => {
        const created = await createPermission(body)
        expect(created.status).toBe(201)

        const relation = relation_service.create(relation_service.buildForCreate({
            id_1: weak_user_id, entity_1: 'user', id_2: created.data.data.id, entity_2: 'permission', relation_type: 'linked'
        }))
        CREATED_RELATION_IDS.push(relation.id)

        return created.data.data.id
    }

    beforeAll(async () => {
        // No route creates a user, so this goes through the service, like the seeder does.
        const user = user_service.create(user_service.buildForCreate({ username: WEAK_USERNAME, password: WEAK_PASSWORD }))
        weak_user_id = user.id
        CREATED_USER_IDS.push(user.id)

        // Signs the weak account in through the real route.
        const login = await axios.post(`${URL}/api/user/login/`, { username: WEAK_USERNAME, password: WEAK_PASSWORD }, AS_WEAK)
        AS_WEAK.headers.Cookie = login.headers['set-cookie'][0].split(';')[0]
    })

    it('answers 403, not 401, to a valid session with nothing attached', async () => {
        const res = await axios.get(`${URL}/api/tag/`, AS_WEAK)
        expect(res.status).toBe(403)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('permission denied')
    })

    it('is refused by every entity that lists authorize, one by one', async () => {
        // The wiring guard: if a routes.js ever drops its authorize, the matching line answers
        //  something other than 403 and the suite says which entity it was.
        expect((await axios.get(`${URL}/api/directory/`, AS_WEAK)).status).toBe(403)
        expect((await axios.get(`${URL}/api/file/`, AS_WEAK)).status).toBe(403)
        expect((await axios.get(`${URL}/api/tag/`, AS_WEAK)).status).toBe(403)
        expect((await axios.get(`${URL}/api/permission/`, AS_WEAK)).status).toBe(403)
        expect((await axios.get(`${URL}/api/workspace/`, AS_WEAK)).status).toBe(403)
        expect((await axios.post(`${URL}/api/metadata/`, { name: `denied-${RUN}`, value: 'x' }, AS_WEAK)).status).toBe(403)
        expect((await axios.post(`${URL}/api/relation/`, {}, AS_WEAK)).status).toBe(403)
    })

    it('still reads the routes that stayed public', async () => {
        expect((await axios.get(`${URL}/api/metadata/`, AS_WEAK)).status).toBe(200)
        expect((await axios.get(`${URL}/api/relation/`, AS_WEAK)).status).toBe(200)
        expect((await axios.get(`${URL}/api/relation/entities/`, AS_WEAK)).status).toBe(200)
    })

    it('opens tags, and only reading them, with a tag-scoped read permission', async () => {
        await grantToWeakUser({ name: `tag-reader-${RUN}`, entity: 'tag', can_read: true })

        expect((await axios.get(`${URL}/api/tag/`, AS_WEAK)).status).toBe(200)
        expect((await axios.post(`${URL}/api/tag/`, { name: `weak-tag-${RUN}` }, AS_WEAK)).status).toBe(403)
        expect((await axios.get(`${URL}/api/file/`, AS_WEAK)).status).toBe(403)
    })

    it('opens the other entities with a global permission underneath', async () => {
        global_reader_id = await grantToWeakUser({ name: `global-reader-${RUN}`, entity: null, can_read: true, can_edit: true })

        expect((await axios.get(`${URL}/api/file/`, AS_WEAK)).status).toBe(200)
        expect((await axios.get(`${URL}/api/directory/`, AS_WEAK)).status).toBe(200)
        expect((await axios.get(`${URL}/api/workspace/`, AS_WEAK)).status).toBe(200)
    })

    it('lets the scoped row decide for its own entity, against the global one', async () => {
        // The global row grants can_edit; the tag-scoped one does not, and for tags it decides.
        const res = await axios.put(`${URL}/api/tag/update/`, { id: 1, name: 'whatever', metadata: '{}' }, AS_WEAK)
        expect(res.status).toBe(403)
    })

    it('shuts the escalation through permission with a scoped denial', async () => {
        // Before the denial the global row answers for `permission` too, and grants edit.
        expect((await axios.get(`${URL}/api/permission/`, AS_WEAK)).status).toBe(200)

        await grantToWeakUser({ name: `permission-denier-${RUN}`, entity: 'permission' })
        expect((await axios.get(`${URL}/api/permission/`, AS_WEAK)).status).toBe(403)

        // With can_edit granted globally, this PUT was the way to hand yourself the four flags.
        const res = await axios.put(`${URL}/api/permission/update/`, {
            id: global_reader_id, name: `global-reader-${RUN}`, entity: null, can_read: true, can_create: true, can_edit: true, can_delete: true
        }, AS_WEAK)
        expect(res.status).toBe(403)
        expect(permission_service.getById(global_reader_id).can_create).toBe(false)
    })

    it('shuts the second door, relation, only when relation is scoped too', async () => {
        // Rights *are* a relation record, so editing relations is another way in.
        expect(permission_service.can(weak_user_id, 'edit', 'relation')).toBe(true)

        await grantToWeakUser({ name: `relation-denier-${RUN}`, entity: 'relation' })

        // The guard answers before the handler, so the body never has to name a real record.
        const res = await axios.put(`${URL}/api/relation/update/`, {
            id: 999999999, id_1: weak_user_id, entity_1: 'user', id_2: 1, entity_2: 'permission', relation_type: 'linked'
        }, AS_WEAK)
        expect(res.status).toBe(403)
        expect(res.data.description).toBe('permission denied')
    })
})
