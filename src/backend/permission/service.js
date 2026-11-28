// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const Permission = require('./model')

// The only door to the permission table.
const repository = require('./repository')

// The shared clock, in epoch seconds.
const { getSystemTime } = require('../core/time')

// The three entity catalogues, which is what a scope or a route may name.
const { ENTITY_HTTP, ENTITY_INTERNAL, ENTITY_REBEL } = require('../core/constants')

// A permission is attached to a user through a relation record, never through a column, so
//  resolving one spans two entities. The other entity is reached through its service — its
//  public surface — and never through its repository or its model.
const relation_service = require('../relation/service')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// DATA ACCESS.
//
//  This service is the only door to repository.js: neither the controller nor the web
//  middleware reaches the repository itself. Every primitive there is exposed here, used or
//  not, and answers plain rows exactly as the repository gave them. A lookup by the identity
//  key normalises it first.
// =====================================================================================

// Every live permission.
_.getAll = () => repository.getAll()

// One live permission by id, or null.
_.getById = (id) => repository.getById(id)

// One live permission by name, or null, whatever casing or accent shape it was typed in.
_.getByName = (name) => repository.getByName(_.normalizeName(name))

// Stores a new permission and hands back the stored row, id included.
_.create = (permission) => repository.post(permission)

// Overwrites a live permission and hands back the stored row, or null when there is no such
//  permission.
_.update = (permission) => repository.update(permission)

// =====================================================================================
// DELETED RECORDS.
//
//  softDelete is what the DELETE route calls. The rest serve backend code only — the
//  seeder, maintenance, the suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live permission, stamping the current time. A deleted permission grants nothing:
 *  the reads getAllByUserId walks see live rows only.
 * @param {Number} id Id of the permission to delete.
 * @returns {Number|null} The id of the deleted permission, or null when no live permission
 *  has that id. A deleted record never travels to the client, so its id is all that comes back.
 */
_.softDelete = (id) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDelete(id, getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted permission.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted permission by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// One deleted permission by name, or null. Normalised like every lookup by the identity key.
_.getDeletedByName = (name) => repository.getDeletedByName(_.normalizeName(name))

// Brings a deleted permission back exactly as it was, flags included. Hands back the row, or
//  null when no deleted permission has that id. The seeder is its main caller: a deleted
//  default role is restored, never re-created over its taken name.
_.restoreSoftDelete = (id) => repository.restoreSoftDelete(id)

// Removes a permission for good, live or deleted.
_.hardDelete = (id) => repository.deleteById(id)

// =====================================================================================
// NORMALISATION.
// =====================================================================================

/**
 * The one shape a permission name is ever stored or compared in.
 *
 * NFC composes the accents and the lower case is what makes the UNIQUE column
 *  case-insensitive — SQLite folds ASCII only, so the fold belongs here and not on the
 *  column. Two roles may not differ by capitals alone: they would read as one to every human.
 * @param {String} name The name as it arrived.
 * @returns {String} The name as the column holds it.
 */
_.normalizeName = (name) => name.normalize('NFC').trim().toLowerCase()

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a Permission out of a create request body.
 * @param {String} body.name The name, normalised on the way in.
 * @param {String} body.entity Optional. The entity the flags apply to. Absent keeps the model
 *  default, null, which is every entity — safe only because the flags default to false.
 * @param {Boolean} body.can_read Optional. Absent keeps the model default, false.
 * @param {Boolean} body.can_create Optional. Absent keeps the model default, false.
 * @param {Boolean} body.can_edit Optional. Absent keeps the model default, false.
 * @param {Boolean} body.can_delete Optional. Absent keeps the model default, false.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // The identity key is the one field normalised.
    const permission = new Permission()
    permission.setName(_.normalizeName(body.name))

    // Each field is assigned only when it was sent, so an omitted one keeps the model default
    //  — which for the four flags is false, the answer that grants nothing.
    if (body.entity !== undefined) permission.setEntity(body.entity)
    if (body.can_read !== undefined) permission.setCanRead(body.can_read)
    if (body.can_create !== undefined) permission.setCanCreate(body.can_create)
    if (body.can_edit !== undefined) permission.setCanEdit(body.can_edit)
    if (body.can_delete !== undefined) permission.setCanDelete(body.can_delete)

    return permission
}

/**
 * Builds a Permission out of an update request body. The whole record is replaced, which is
 *  why the validator requires the scope and the four flags rather than defaulting them.
 * @param {Number} body.id Id of the permission being written.
 * @param {String} body.name The name, normalised on the way in.
 * @param {String} body.entity The entity the flags apply to, or null for every entity.
 * @param {Boolean} body.can_read Whether the holder may read.
 * @param {Boolean} body.can_create Whether the holder may create.
 * @param {Boolean} body.can_edit Whether the holder may edit.
 * @param {Boolean} body.can_delete Whether the holder may delete.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it, so the model does not carry one.
    const permission = new Permission()
    permission.setClass(
        body.id,
        _.normalizeName(body.name),
        body.entity,
        body.can_read,
        body.can_create,
        body.can_edit,
        body.can_delete,
        null
    )

    return permission
}

// =====================================================================================
// UNIQUENESS GUARDS.
//
//  A deleted permission still holds its UNIQUE name, so the handlers ask both families
//  before storing: a controlled 409 instead of the constraint blowing up into a 500.
// =====================================================================================

// True when a live permission holds the name.
_.isNameTaken = (name) => _.getByName(name) !== null

// True when a deleted permission holds the name. The client cannot see that permission, so it
//  gets a 409 of its own.
_.isNameHeldByDeleted = (name) => _.getDeletedByName(name) !== null

/**
 * The live guard for an update, ignoring the permission being updated so it can keep its own
 *  name.
 * @param {String} name The name to check.
 * @param {Number} id Id of the permission being updated.
 * @returns {Boolean} True when another live permission already holds the name.
 */
_.isNameTakenByAnother = (name, id) => {
    // Nobody holds it: free.
    const clash = _.getByName(name)
    if (clash === null) return false

    // Held by the permission itself: still free for it.
    return clash.id !== id
}

// =====================================================================================
// AUTHORIZATION.
//
//  What a user may do is the permission attached to them, and that attachment is a relation
//  record: user (id_1) linked to permission (id_2). This is the entity's real product and the
//  only place that knows how a right is resolved.
// =====================================================================================

/**
 * Every live permission attached to a user.
 *
 * A user holds as many as there are links pointing at them: one global row and any number of
 *  scoped ones is the shape this is built for. A deleted link and a deleted permission never
 *  reach the walk at all, because both services read live rows only.
 *
 * relation_type is checked on purpose. Every type is legitimate between a user and a
 *  permission, as between any two entities — nothing forbids tagging a permission — but only
 *  `linked` *means* "this user holds this permission". Reading any type as a grant would hand
 *  a second, quieter way of moving rights around to anyone who can create relations.
 * @param {Number} user_id Id of the user, as it comes out of the session token.
 * @returns {Object[]} The permissions, in the order the relations came back. Empty, never
 *  null, when nothing grants the user anything.
 */
_.getAllByUserId = (user_id) => {
    // Every live link mentioning this id on either side. Ids collide across tables, so each
    //  one is checked below for the entity on both ends too.
    const relations = relation_service.getByEntityId(user_id)

    // What the walk collects.
    const permissions = []

    for (const relation of relations) {
        // Only a user-to-permission `linked` relation is a grant, and only for this user.
        if (relation.relation_type !== 'linked') continue
        if (relation.entity_1 !== 'user') continue
        if (relation.id_1 !== user_id) continue
        if (relation.entity_2 !== 'permission') continue

        // The link may outlive the permission it points at: a deleted permission reads as
        //  null here and grants nothing.
        const permission = _.getById(relation.id_2)
        if (permission === null) continue

        permissions.push(permission)
    }

    return permissions
}

/**
 * Answers whether a user may perform a verb on an entity. Two rules decide, in this order:
 *
 *   1. **The most specific grant decides.** A permission scoped to this very entity answers
 *      on its own — even when it says no. That is what makes "read everything except
 *      permission" expressible: a global row granting read, plus a row scoped to `permission`
 *      denying it. Only when the user holds no row for this entity does the global one answer.
 *   2. **Deny wins**, among rows of the same specificity. A user can hold two permissions
 *      scoped to the same entity, and one saying no is enough. The alternative — first match
 *      wins — made the answer depend on the order rows came out of a SELECT with no ORDER BY,
 *      so "hold a denial? add a permissive row next to it" was a race against insertion order.
 *
 * Hence four passes, deliberately not fused: denials before grants, scoped before global.
 *  Each loop is one sentence of the rule above, and the priority stays legible as sequence
 *  rather than as loop state. Everything that is not an explicit yes denies.
 * @param {Number} user_id Id of the user, from the session token and never from the request.
 * @param {String} verb One of read, create, edit, delete. The route declares it.
 * @param {String} entity The entity being reached. The route declares it too.
 * @returns {Boolean} True only when some permission says so.
 */
_.can = (user_id, verb, entity) => {
    // An entity outside the catalogues denies, which turns a typo in a routes.js —
    //  authorize('read', 'tags') — into a visible 403 instead of a silent fall-through to
    //  whatever the caller's global permission happens to say.
    const entity_is_known = ENTITY_HTTP.includes(entity) || ENTITY_INTERNAL.includes(entity) || ENTITY_REBEL.includes(entity)
    if (entity_is_known === false) return false

    // Every live permission the user holds, scoped and global together.
    const permissions = _.getAllByUserId(user_id)

    // Scoped to this entity: a single denial settles it.
    for (const permission of permissions) {
        if (permission.entity === entity && readVerb(permission, verb) === false) return false
    }

    // No scoped denial, so any scoped row that reaches here grants.
    for (const permission of permissions) {
        if (permission.entity === entity) return true
    }

    // No scoped row at all: the global ones answer, under the same deny-wins rule.
    for (const permission of permissions) {
        if (permission.entity === null && readVerb(permission, verb) === false) return false
    }

    // No global denial, so any global row that reaches here grants.
    for (const permission of permissions) {
        if (permission.entity === null) return true
    }

    // Nothing granted it. Absence never grants.
    return false
}

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

/**
 * Reads one verb off one permission row.
 * @param {Object} permission The permission to read.
 * @param {String} verb One of read, create, edit, delete.
 * @returns {Boolean} The flag, and false for a verb outside the four — so a typo in a route
 *  never grants anything by way of `undefined` being falsy.
 */
function readVerb(permission, verb) {
    // One branch per verb, each one the flag of the same name.
    if (verb === 'read') return permission.can_read
    if (verb === 'create') return permission.can_create
    if (verb === 'edit') return permission.can_edit
    if (verb === 'delete') return permission.can_delete

    // An unknown verb grants nothing.
    return false
}

module.exports = _
