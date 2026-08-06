const Permission = require('./model')
const repository = require('./repository')
const { getSystemTime } = require('../core/time')
const { SYSTEM_ENTITIES } = require('../core/constants')

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
//  defaults to null; a flag the client omits keeps the model default, which is false, and an
//  omitted entity keeps the model default too, which is null — the permission applies to all.
_.buildForCreate = (body) => {
    const permission = new Permission()
    permission.name = body.name
    if (body.entity !== undefined) permission.entity = body.entity
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
    permission.setClass(body.id, body.name, body.entity, body.can_read, body.can_create, body.can_edit, body.can_delete, deleted_at)
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

// Every live permission attached to a user, in the order the relations come back. A user holds
//  as many as there are links pointing at them: one global row and any number of scoped ones is
//  the shape this is built for. The list is empty when nothing grants the user anything, and
//  three separate things put a row out of it — a link in the trash, a permission in the trash,
//  or a link that points at something other than a permission.
_.getAllByUserId = (user_id) => {
    const relations = relation_service.getByEntityId(user_id)
    const permissions = []

    for (const relation of relations) {
        if (relation.deleted_at !== null) continue
        if (relation.entity_1 !== 'user') continue
        if (relation.id_1 !== user_id) continue
        if (relation.entity_2 !== 'permission') continue

        const permission = repository.getById(relation.id_2)
        if (permission === null) continue
        if (permission.deleted_at !== null) continue

        permissions.push(permission)
    }

    return permissions
}

// Reads one verb off one permission row. Unknown verbs deny, so a typo in a route never grants
//  anything by way of `undefined` being falsy.
const readVerb = (permission, verb) => {
    if (verb === 'read') return permission.can_read
    if (verb === 'create') return permission.can_create
    if (verb === 'edit') return permission.can_edit
    if (verb === 'delete') return permission.can_delete

    return false
}

// Answers whether a user may perform a verb on an entity.
//
// The rule is **the most specific grant decides**, in two passes:
//
//   1. A permission scoped to this very entity answers on its own — even when it says no. That
//      is what makes "read everything except permission" expressible: a global row granting
//      read, plus a row scoped to `permission` denying it.
//   2. Otherwise the global permission (entity null) answers, if the user holds one.
//
// Everything else denies. A user with no permission at all, a verb outside the four, and an
//  entity outside SYSTEM_ENTITIES are each their own branch. That last one matters: it turns a
//  typo in a routes.js — `authorize('read', 'tags')` — into a visible 403 instead of a silent
//  fall-through to whatever the global permission happens to say.
_.can = (user_id, verb, entity) => {
    if (!SYSTEM_ENTITIES.includes(entity)) return false

    const permissions = _.getAllByUserId(user_id)

    for (const permission of permissions) {
        if (permission.entity === entity) return readVerb(permission, verb)
    }

    for (const permission of permissions) {
        if (permission.entity === null) return readVerb(permission, verb)
    }

    return false
}

module.exports = _
 