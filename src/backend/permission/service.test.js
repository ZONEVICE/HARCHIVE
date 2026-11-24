// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const permission_service = require('./service')

// The two entities the authorization chain spans: who holds a permission is a relation, and
//  the holder is a user. Both are scaffolding here, reached through their services.
const relation_service = require('../relation/service')
const user_service = require('../user/service')

// The name of the role the seeded account holds.
const { ADMINISTRATOR_PERMISSION_NAME } = require('./util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// Every relation type except the one that means "this user holds this permission".
const NOT_A_GRANT = ['contains', 'sibling', 'tagged', 'implies']

// =====================================================================================
// STATE.
// =====================================================================================

// Ids of every permission, relation and user this suite creates, purged in afterAll.
const CREATED_PERMISSION_IDS = []
const CREATED_RELATION_IDS = []
const CREATED_USER_IDS = []

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

/**
 * Creates a permission through the service and remembers it for the purge.
 * @param {String} label Short, readable part of the name; the run suffix is added here.
 * @param {String} entity The scope, or null for every entity.
 * @param {Boolean[]} flags can_read, can_create, can_edit and can_delete, in that order.
 * @returns {Object} The stored row.
 */
const createPermission = (label, entity, flags) => {
    // The model is built by the service, like every write.
    const body = { name: `${label}-${RUN}`, entity, can_read: flags[0], can_create: flags[1], can_edit: flags[2], can_delete: flags[3] }
    const created = permission_service.create(permission_service.buildForCreate(body))

    CREATED_PERMISSION_IDS.push(created.id)
    return created
}

/**
 * Creates a real account through the service and remembers it for the purge.
 * @param {String} label Short, readable part of the username; the run suffix is added here.
 * @returns {Number} The id of the account.
 */
const createUser = (label) => {
    // No route creates a user, so the service is the way in, exactly as the seeder does it.
    const created = user_service.create(user_service.buildForCreate({ username: `${label}-${RUN}`, password: 'secret' }))

    CREATED_USER_IDS.push(created.id)
    return created.id
}

/**
 * Links a user to a permission and remembers the link for the purge.
 * @param {Number} user_id Id of the user, id_1 of the link.
 * @param {Number} permission_id Id of the permission, id_2 of the link.
 * @param {String} relation_type Optional. The type of the link; `linked` when omitted.
 * @returns {Object} The stored relation.
 */
const link = (user_id, permission_id, relation_type = 'linked') => {
    // The link is built by the entity that owns it.
    const body = { id_1: user_id, entity_1: 'user', id_2: permission_id, entity_2: 'permission', relation_type }
    const created = relation_service.create(relation_service.buildForCreate(body))

    CREATED_RELATION_IDS.push(created.id)
    return created
}

// Asserts that a user may do nothing at all on the given entity.
const expectEverythingDenied = (user_id, entity) => {
    expect(permission_service.can(user_id, 'read', entity)).toBe(false)
    expect(permission_service.can(user_id, 'create', entity)).toBe(false)
    expect(permission_service.can(user_id, 'edit', entity)).toBe(false)
    expect(permission_service.can(user_id, 'delete', entity)).toBe(false)
}

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// Purges what this suite created, links first, and nothing else: no table is ever emptied.
afterAll(() => {
    for (const id of CREATED_RELATION_IDS) relation_service.hardDelete(id)
    for (const id of CREATED_PERMISSION_IDS) permission_service.hardDelete(id)
    for (const id of CREATED_USER_IDS) user_service.hardDelete(id)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('the deleted-record family', () => {
    // The permission deleted and brought back across the tests of this block.
    let deleted = null

    beforeAll(() => {
        deleted = createPermission('service-deleted', 'tag', [true, false, true, false])
        permission_service.softDelete(deleted.id)
    })

    it('getDeletedById finds the deleted permission that the ordinary read cannot see', () => {
        expect(permission_service.getById(deleted.id)).toBeNull()
        expect(permission_service.getDeletedById(deleted.id).name).toBe(deleted.name)
    })

    it('getDeletedByName finds it by name, in any case', () => {
        expect(permission_service.getDeletedByName(deleted.name.toUpperCase()).id).toBe(deleted.id)
    })

    it('getDeletedAll lists it, and no live permission', () => {
        const rows = permission_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted.id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })

    it('getDeletedById answers the flags as real booleans', () => {
        const row = permission_service.getDeletedById(deleted.id)
        expect(row.can_read).toBe(true)
        expect(row.can_create).toBe(false)
    })

    it('restoreSoftDelete brings the same row back, flags untouched', () => {
        const restored = permission_service.restoreSoftDelete(deleted.id)
        expect(restored.id).toBe(deleted.id)
        expect(restored.deleted_at).toBeNull()
        expect(restored.entity).toBe('tag')
        expect(restored.can_read).toBe(true)
        expect(restored.can_edit).toBe(true)
        expect(restored.can_delete).toBe(false)
    })

    it('restoreSoftDelete answers null on a permission that is live', () => {
        expect(permission_service.restoreSoftDelete(deleted.id)).toBeNull()
    })
})

describe('hardDelete', () => {
    it('removes the row from both families', () => {
        const created = permission_service.create(permission_service.buildForCreate({ name: `service-purged-${RUN}` }))

        permission_service.hardDelete(created.id)

        expect(permission_service.getById(created.id)).toBeNull()
        expect(permission_service.getDeletedById(created.id)).toBeNull()
    })
})

// =====================================================================================
// AUTHORIZATION.
//
//  What a user may do is computed by can(), out of permission rows reached through `linked`
//  relations. The links are scaffolding: what these tests read is the answer the service
//  computes, which is why they live in this entity's suite and not in relation's.
// =====================================================================================

describe('getAllByUserId and can — the link seeded at boot', () => {
    it('grants the seeded admin every verb on every entity', () => {
        const admin = user_service.getAdminUser()
        const permissions = permission_service.getAllByUserId(admin.id)

        expect(permissions.some((permission) => permission.name === ADMINISTRATOR_PERMISSION_NAME)).toBe(true)
        expect(permission_service.can(admin.id, 'read', 'tag')).toBe(true)
        expect(permission_service.can(admin.id, 'delete', 'permission')).toBe(true)
    })
})

describe('can — a user with no link', () => {
    it('is denied everything: absence never grants', () => {
        const user_id = createUser('service-nobody')
        expect(permission_service.getAllByUserId(user_id)).toEqual([])
        expectEverythingDenied(user_id, 'tag')
    })
})

describe('can — rights move with the rows, with no new session', () => {
    // The user, the permission it holds and the link between them.
    let user_id = null
    let permission = null
    let relation = null

    beforeAll(() => {
        user_id = createUser('service-holder')
        permission = createPermission('service-global', null, [true, false, false, false])
        relation = link(user_id, permission.id)
    })

    it('answers the flags of the linked permission', () => {
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(true)
        expect(permission_service.can(user_id, 'create', 'tag')).toBe(false)
    })

    it('follows a flag change straight away', () => {
        permission_service.update(permission_service.buildForUpdate({ ...permission, can_create: true }))
        expect(permission_service.can(user_id, 'create', 'tag')).toBe(true)
    })

    it('survives a rename of the permission', () => {
        permission_service.update(permission_service.buildForUpdate({ ...permission, name: `service-renamed-${RUN}`, can_create: true }))
        expect(permission_service.can(user_id, 'create', 'tag')).toBe(true)
    })

    it('grants nothing once the link is deleted, and everything back once it is restored', () => {
        relation_service.softDelete(relation.id)
        expectEverythingDenied(user_id, 'tag')

        relation_service.restoreSoftDelete(relation.id)
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(true)
    })

    it('grants nothing once the permission is deleted, and everything back once it is restored', () => {
        permission_service.softDelete(permission.id)
        expectEverythingDenied(user_id, 'tag')

        permission_service.restoreSoftDelete(permission.id)
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(true)
    })

    it('follows the link when it is re-pointed at another permission', () => {
        const denier = createPermission('service-nothing', null, [false, false, false, false])
        relation_service.update(relation_service.buildForUpdate({ ...relation, id_2: denier.id }))
        expectEverythingDenied(user_id, 'tag')

        // Put back for the tests below.
        relation_service.update(relation_service.buildForUpdate(relation))
    })

    it('lets two users share one permission row', () => {
        const second_user_id = createUser('service-sharer')
        link(second_user_id, permission.id)

        expect(permission_service.can(second_user_id, 'read', 'tag')).toBe(true)
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(true)
    })
})

describe('can — only a `linked` relation is a grant', () => {
    // The user and the permission every type below is tried between.
    let user_id = null
    let permission = null

    beforeAll(() => {
        user_id = createUser('service-types')
        permission = createPermission('service-types', null, [true, true, true, true])
    })

    it.each(NOT_A_GRANT)('a `%s` relation between the user and the permission grants nothing', (relation_type) => {
        // The row is a perfectly valid relation, it simply is not a grant.
        link(user_id, permission.id, relation_type)
        expect(permission_service.getAllByUserId(user_id)).toEqual([])
        expectEverythingDenied(user_id, 'tag')
    })

    it('the same pair related as `linked` does grant, with every other row still in place', () => {
        link(user_id, permission.id)
        expect(permission_service.getAllByUserId(user_id).length).toBe(1)
        expect(permission_service.can(user_id, 'delete', 'tag')).toBe(true)
    })

    it('a link pointing at something that is not a permission grants nothing', () => {
        const other_user_id = createUser('service-not-permission')
        const created = relation_service.create(relation_service.buildForCreate({
            id_1: other_user_id, entity_1: 'user', id_2: permission.id, entity_2: 'tag', relation_type: 'linked'
        }))
        CREATED_RELATION_IDS.push(created.id)

        expectEverythingDenied(other_user_id, 'tag')
    })
})

describe('can — the most specific grant decides', () => {
    // The user, holding one global and one scoped row.
    let user_id = null

    beforeAll(() => {
        user_id = createUser('service-scoped')
        link(user_id, createPermission('service-global-reader', null, [true, false, true, false]).id)
        link(user_id, createPermission('service-tag-reader', 'tag', [true, false, false, false]).id)
    })

    it('lets the global row answer for an entity nothing is scoped to', () => {
        expect(permission_service.can(user_id, 'edit', 'file')).toBe(true)
    })

    it('lets the scoped row decide for its own entity, even against the global one', () => {
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(true)
        expect(permission_service.can(user_id, 'edit', 'tag')).toBe(false)
    })

    it('denies an entity outside the catalogues, so a typo in a route is a visible 403', () => {
        expect(permission_service.can(user_id, 'read', 'tags')).toBe(false)
    })

    it('denies a verb outside the four', () => {
        expect(permission_service.can(user_id, 'purge', 'file')).toBe(false)
    })
})

describe('can — deny wins between rows of the same scope', () => {
    // The user, the granting row it holds before the denial arrives, and the link to it.
    let user_id = null
    let granting = null
    let granting_link = null

    beforeAll(() => {
        user_id = createUser('service-deny-wins')
        granting = createPermission('service-deny-wins-yes', 'tag', [true, true, true, true])
        granting_link = link(user_id, granting.id)
    })

    it('one permission scoped to the entity answers on its own', () => {
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(true)
    })

    it('a second row scoped to the same entity that says no takes it away', () => {
        link(user_id, createPermission('service-deny-wins-no', 'tag', [false, false, false, false]).id)
        expect(permission_service.getAllByUserId(user_id).length).toBe(2)
        expectEverythingDenied(user_id, 'tag')
    })

    it('does not depend on which row was linked first', () => {
        // Purging the granting link and linking it again puts it last, which under "first match
        //  wins" would have flipped the answer.
        relation_service.hardDelete(granting_link.id)
        link(user_id, granting.id)
        expect(permission_service.can(user_id, 'read', 'tag')).toBe(false)
    })

    it('says nothing about an entity neither row is scoped to', () => {
        expect(permission_service.can(user_id, 'read', 'file')).toBe(false)
    })
})
