// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const Relation = require('./model')

// The only door to the relation table.
const repository = require('./repository')

// The fixed catalogue of what a link may mean.
const { RELATION_TYPES } = require('./types-of-relation')

// The shared clock, in epoch seconds.
const { getSystemTime } = require('../core/time')

// The three entity catalogues: an end of a relation must name a member of one of them.
const { ENTITY_HTTP, ENTITY_INTERNAL, ENTITY_REBEL } = require('../core/constants')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// DATA ACCESS.
//
//  This service is the only door to repository.js: a controller never reaches the repository
//  itself, and neither does any other entity that needs a link. Every primitive there is
//  exposed here, used or not, and answers plain rows exactly as the repository gave them.
// =====================================================================================

// Every live relation.
_.getAll = () => repository.getAll()

// One live relation by id, or null.
_.getById = (id) => repository.getById(id)

// Every live relation naming an entity on either side.
_.getByEntity = (entity) => repository.getByEntity(entity)

// Every live relation mentioning a record id on either side. The id alone is matched, and ids
//  collide across tables, so a caller that means one entity checks entity_1 / entity_2 too.
_.getByEntityId = (entity_id) => repository.getByEntityId(entity_id)

// The live relation with exactly these two ends and this type, or null.
_.getByEnds = (relation) => repository.getByEnds(relation)

// Stores a new relation and hands back the stored row, id included.
_.create = (relation) => repository.post(relation)

// Overwrites a live relation and hands back the stored row, or null when there is none.
_.update = (relation) => repository.update(relation)

// =====================================================================================
// DELETED RECORDS.
//
//  softDelete is what the DELETE route calls, and reviveDeletedTwin is what POST calls. The
//  rest serve backend code only — maintenance, the suites — and no route reaches them.
// =====================================================================================

/**
 * Deletes a live relation, stamping the current time.
 * @param {Number} id Id of the relation to delete.
 * @returns {Number|null} The id of the deleted relation, or null when no live one has that id.
 *  A deleted record never travels to the client, so its id is all that comes back.
 */
_.softDelete = (id) => {
    // The repository matches live rows only, so a second delete finds nothing to stamp.
    const deleted = repository.softDelete(id, getSystemTime())
    if (deleted === null) return null

    return deleted.id
}

// Every deleted relation.
_.getDeletedAll = () => repository.getDeletedAll()

// One deleted relation by id, or null.
_.getDeletedById = (id) => repository.getDeletedById(id)

// Every deleted relation naming an entity on either side.
_.getDeletedByEntity = (entity) => repository.getDeletedByEntity(entity)

// Every deleted relation mentioning a record id on either side.
_.getDeletedByEntityId = (entity_id) => repository.getDeletedByEntityId(entity_id)

// A deleted relation with exactly these two ends and this type, or null.
_.getDeletedByEnds = (relation) => repository.getDeletedByEnds(relation)

// Brings a deleted relation back exactly as it was. Hands back the row, or null when no
//  deleted relation has that id.
_.restoreSoftDelete = (id) => repository.restoreSoftDelete(id)

// Removes a relation for good, live or deleted.
_.hardDelete = (id) => repository.deleteById(id)

/**
 * Brings back the deleted twin of a relation about to be created, instead of storing a
 *  duplicate of it.
 *
 * Note: this is relation's own exception to the delete policy. Removing a tag from a file and
 *  putting it back must work, and under the default the deleted link would block it forever,
 *  since the client can neither see nor restore it. Reviving overwrites the moment the link
 *  was removed, which is acceptable because that moment was never history — history belongs
 *  to the log entity.
 * @param {Object} relation The relation the client asked to create, its note included.
 * @returns {Object|null} The revived row, carrying the note of this request, or null when no
 *  deleted twin exists and a plain create is the right answer.
 */
_.reviveDeletedTwin = (relation) => {
    // No deleted relation with the same five values: nothing to revive.
    const twin = repository.getDeletedByEnds(relation)
    if (twin === null) return null

    // Cleared first, so the row is live again and the update below can match it.
    repository.restoreSoftDelete(twin.id)

    // The note is the one value the request may change: it says what the link means now.
    relation.setId(twin.id)
    return repository.update(relation)
}

// =====================================================================================
// CATALOGUES.
//
//  Both are published over HTTP, because a client composing a relation has to know the legal
//  values without hard-coding them. They live here rather than in the controller so the
//  handler keeps importing nothing but this service and the validators.
// =====================================================================================

/**
 * Every entity name a relation may name on either side.
 * @returns {String[]} The members of the three catalogues that own a table. The kind of
 *  entity makes no difference to a link; a table with an id is the one requirement, so an
 *  entity with none — the seeder — is left out.
 */
_.getEntities = () => {
    // The three catalogues, in one list.
    const names = [...ENTITY_HTTP, ...ENTITY_INTERNAL, ...ENTITY_REBEL]

    // Only those an end can actually point at.
    return names.filter((name) => repository.isTable(name) === true)
}

/**
 * Every verb a relation may carry.
 * @returns {String[]} The fixed catalogue from types-of-relation.js.
 */
_.getTypes = () => [...RELATION_TYPES]

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a Relation out of a create request body.
 * @param {Number} body.id_1 Id of the record on the first side.
 * @param {String} body.entity_1 Name of the entity owning id_1.
 * @param {Number} body.id_2 Id of the record on the second side.
 * @param {String} body.entity_2 Name of the entity owning id_2.
 * @param {String} body.relation_type One of the catalogue verbs.
 * @param {String} body.note Optional. Free text. Absent is stored as null.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // The two ends and the type, as they arrived. Nothing here is an identity key.
    const relation = new Relation()
    relation.setId1(body.id_1)
    relation.setEntity1(body.entity_1)
    relation.setId2(body.id_2)
    relation.setEntity2(body.entity_2)
    relation.setRelationType(body.relation_type)

    // The note is free text nothing branches on, so an absent one is simply null.
    relation.setNote(body.note ?? null)

    return relation
}

/**
 * Builds a Relation out of an update request body. The whole record is replaced, so a client
 *  changing one field sends every other one back untouched.
 * @param {Number} body.id Id of the relation being written.
 * @param {Number} body.id_1 Id of the record on the first side.
 * @param {String} body.entity_1 Name of the entity owning id_1.
 * @param {Number} body.id_2 Id of the record on the second side.
 * @param {String} body.entity_2 Name of the entity owning id_2.
 * @param {String} body.relation_type One of the catalogue verbs.
 * @param {String} body.note Optional. Free text, or null.
 * @returns {Object} The model to hand to update().
 */
_.buildForUpdate = (body) => {
    // deleted_at stays null: an update never writes it, so the model does not carry one.
    const relation = new Relation()
    relation.setClass(
        body.id,
        body.id_1,
        body.entity_1,
        body.id_2,
        body.entity_2,
        body.relation_type,
        body.note ?? null,
        null
    )

    return relation
}

// =====================================================================================
// GUARDS.
//
//  The business validations a relation needs before it is stored. Each one reads as one line
//  in the handler, which turns its answer into a status code.
// =====================================================================================

/**
 * Says whether an entity can be an end of a relation: a member of one of the catalogues that
 *  owns a table. The validators already checked membership; the table needs the database, so
 *  it is asked here.
 * @param {String} entity The entity name.
 * @returns {Boolean} True when a relation may point at it.
 */
_.isEntityRelatable = (entity) => {
    // A name in none of the catalogues is not an entity of this system.
    const entity_is_known = ENTITY_HTTP.includes(entity) || ENTITY_INTERNAL.includes(entity) || ENTITY_REBEL.includes(entity)
    if (entity_is_known === false) return false

    // A known entity with no table has no record to point at.
    return repository.isTable(entity)
}

/**
 * Says whether both ends of a relation are the same record — same id and same entity. Ids
 *  collide across tables, so the same id on two different entities is two records.
 * @param {Object} relation The relation to check.
 * @returns {Boolean} True when the relation would link a record to itself.
 */
_.isReflexive = (relation) => relation.getId1() === relation.getId2() && relation.getEntity1() === relation.getEntity2()

// True when a live relation already has these two ends and this type.
_.isLinkTaken = (relation) => _.getByEnds(relation) !== null

/**
 * The live duplicate guard for an update, ignoring the relation being updated so it can keep
 *  its own ends.
 * @param {Object} relation The relation being written, id included.
 * @returns {Boolean} True when another live relation already has these ends and this type.
 */
_.isLinkTakenByAnother = (relation) => {
    // Nobody holds these five values: free.
    const clash = _.getByEnds(relation)
    if (clash === null) return false

    // Held by the relation itself: still free for it.
    return clash.id !== relation.getId()
}

module.exports = _
