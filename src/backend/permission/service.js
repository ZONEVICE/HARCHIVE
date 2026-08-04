const Permission = require('./model')
const repository = require('./repository')
const { getSystemTime } = require('../core/time')

// A permission is attached to a user through a relation record, never through a column, so
//  resolving one spans two entities. The other entity is reached through its service — its
//  public surface — and never through its repository.
const relation_service = require('../relation/service')

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

// Clears the trash mark without touching the flags. It is not reachable from any HTTP endpoint
//  — a client restores a permission by sending deleted_at: false to the update route. It exists
//  for the seeder entity, which restores a default permission sitting in the trash instead of
//  re-creating it, because its UNIQUE name is still taken.
_.restoreFromTrashCan = (id) => repository.restoreFromTrashCan(id)

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

module.exports = _
