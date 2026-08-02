const Permission = require('./model')
const repository = require('./repository')
const { getSystemTime } = require('../core/time')
const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('./util')

// A permission is attached to a user through a relation record, never through a column, so
//  resolving one spans two entities. The other entity is reached through its service — its
//  public surface — and never through its repository.
const relation_service = require('../relation/service')
const user_service = require('../user/service')

const _ = {}

// --------------------------------------------------------------------------------
// Data access. This service is the only door to repository.js: a controller never
//  reaches the repository itself, it always comes through here.
// --------------------------------------------------------------------------------
_.getAll = () => repository.getAll()
_.getById = (id) => repository.getById(id)
_.getByName = (name) => repository.getByName(name)
_.create = (permission) => repository.post(permission)
_.update = (permission) => repository.update(permission)

// Resolves the deleted_at value to store on update. The client sends a boolean, never a
//  timestamp: true stamps the current system time, false clears the mark, and null (or an
//  absent field) does nothing — it keeps whatever the stored row already had.
_.resolveDeletedAt = (current, deleted_at_flag) => {
    if (deleted_at_flag === undefined || deleted_at_flag === null) return current ? current.deleted_at : null
    return deleted_at_flag ? getSystemTime() : null
}

// Builds a Permission from a create request. The id is assigned by the database and deleted_at
//  defaults to null; a flag the client omits keeps the model default, which is false.
_.buildForCreate = (body) => {
    const permission = new Permission()
    permission.name = body.name
    if (body.can_read !== undefined) permission.can_read = body.can_read
    if (body.can_create !== undefined) permission.can_create = body.can_create
    if (body.can_edit !== undefined) permission.can_edit = body.can_edit
    if (body.can_delete !== undefined) permission.can_delete = body.can_delete
    return permission
}

// Builds a Permission from an update request. It resolves deleted_at itself from the stored row
//  and the client flag, so the controller does not deal with timestamps.
_.buildForUpdate = (current, body) => {
    const deleted_at = _.resolveDeletedAt(current, body.deleted_at)
    const permission = new Permission()
    permission.setClass(body.id, body.name, body.can_read, body.can_create, body.can_edit, body.can_delete, deleted_at)
    return permission
}

// Permission names are unique and case-insensitive. Soft-deleted permissions still hold their
//  name, so they count as taken here.
_.isNameTaken = (name) => repository.getByName(name) !== null

// Same rule, but ignoring the permission being updated so it can keep its own name.
_.isNameTakenByAnother = (name, id) => {
    const clash = repository.getByName(name)
    if (!clash) return false
    return clash.id !== id
}

// Soft-delete: stamp deleted_at instead of removing the row, so the record stays readable and
//  the relations pointing at this permission keep resolving it.
_.softDelete = (id) => repository.softDelete(id, getSystemTime())

// Hard-delete: physically removes the row. Deliberately not wired to any HTTP endpoint —
//  it exists for backend code that genuinely needs to purge a record.
_.hardDelete = (id) => repository.deleteById(id)

// --------------------------------------------------------------------------------
// Authorization. What a user is allowed to do is the permission attached to them, and
//  that attachment is a relation record: user (id_1) linked to permission (id_2).
// --------------------------------------------------------------------------------

// The live permission of a user, or null when there is none. Three separate things make it
//  null, and every one of them means "no rights at all": no link, a link sitting in the trash,
//  or a permission sitting in the trash.
_.getByUserId = (user_id) => {
    const relations = relation_service.getByEntityId(user_id)

    for (const relation of relations) {
        if (relation.deleted_at !== null) continue
        if (relation.entity_1 !== 'user') continue
        if (relation.id_1 !== user_id) continue
        if (relation.entity_2 !== 'permission') continue

        const permission = repository.getById(relation.id_2)
        if (permission === null) continue
        if (permission.deleted_at !== null) continue

        return permission
    }

    return null
}

// Answers whether a user may perform a verb. Every unknown case denies: a user without a
//  permission, a soft-deleted one and an unknown verb are all explicit branches here, never
//  an accident of undefined being falsy.
_.can = (user_id, verb) => {
    const permission = _.getByUserId(user_id)
    if (permission === null) return false

    if (verb === 'read') return permission.can_read
    if (verb === 'create') return permission.can_create
    if (verb === 'edit') return permission.can_edit
    if (verb === 'delete') return permission.can_delete

    return false
}

// --------------------------------------------------------------------------------
// Seed data, called from index.js after the tables are created.
// --------------------------------------------------------------------------------

// Creates one default permission when it is missing, and does nothing when a live row already
//  holds the name — an existing permission is never overwritten, so a deliberate change to its
//  flags survives a restart.
//
// The naive "create it if getByName finds nothing" check would be wrong here: a soft-deleted
//  row still holds its UNIQUE name and is still returned by reads, so a permission sitting in
//  the trash would pass the check silently and leave the system without an administrator, and
//  re-creating the name would hit the UNIQUE constraint and throw. A trashed default row is
//  restored instead, keeping the flags it had.
_.ensureDefaultPermission = (name, can_read, can_create, can_edit, can_delete) => {
    const current = repository.getByName(name)

    if (current !== null && current.deleted_at === null) return
    if (current !== null) return repository.restore(current.id)

    const permission = new Permission()
    permission.name = name
    permission.can_read = can_read
    permission.can_create = can_create
    permission.can_edit = can_edit
    permission.can_delete = can_delete
    repository.post(permission)
}

// The two roles the application ships with. Idempotent: it runs on every boot.
_.createDefaultPermissions = () => {
    _.ensureDefaultPermission(ADMINISTRATOR_PERMISSION_NAME, true, true, true, true)
    _.ensureDefaultPermission(GUEST_PERMISSION_NAME, true, false, false, false)

    // Fail loudly: a backend without a live administrator permission is half-initialised and
    //  must not come up at all.
    const administrator = repository.getByName(ADMINISTRATOR_PERMISSION_NAME)
    if (administrator === null || administrator.deleted_at !== null) {
        console.error('Error: the administrator permission could not be created.')
        process.exit(1)
    }
}

// Grants the administrator permission to the seeded admin user. It spans user, permission and
//  relation, and it lives here because this entity owns the operation "attach a permission".
//  Idempotent, and it never overrides an existing link: an admin user deliberately moved to
//  another permission keeps it.
_.linkAdminUser = () => {
    const user = user_service.getAdminUser()
    const administrator = repository.getByName(ADMINISTRATOR_PERMISSION_NAME)

    if (user === null || administrator === null) {
        console.error('Error: the admin user could not be linked to the administrator permission.')
        process.exit(1)
    }

    if (_.getByUserId(user.id) !== null) return

    const relation = relation_service.buildForCreate({
        id_1: user.id,
        entity_1: 'user',
        id_2: administrator.id,
        entity_2: 'permission',
        relation_type: 'linked',
        note: 'admin user granted the administrator permission'
    })
    relation_service.create(relation)
}

module.exports = _
