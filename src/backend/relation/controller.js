// =====================================================================================
// IMPORTS.
//
//  Two, and never a third: a controller imports its validators and its service. The two
//  catalogues it publishes are read through the service as well.
// =====================================================================================

// The request predicates and validators of this entity.
const validators = require('./validators')

// The only way this file reaches the data.
const service = require('./service')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// CATALOGUE CONTROLLERS.
// =====================================================================================

// Answers the entity names a relation may name on either side, so a client composing one
//  never hard-codes the list.
_.getEntities = async (req, res) => {
    try {
        // The catalogue members that own a table.
        const data = service.getEntities()
        return res.status(200).json({ status: 'success', description: 'relation entities retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation entities retrieval failed' })
    }
}

// Answers the fixed catalogue of relation types, for the same reason.
_.getTypes = async (req, res) => {
    try {
        // The verbs a relation may carry.
        const data = service.getTypes()
        return res.status(200).json({ status: 'success', description: 'relation types retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation types retrieval failed' })
    }
}

// =====================================================================================
// ROUTE CONTROLLERS.
// =====================================================================================

// Answers every live relation. Deleted ones never reach this list: the repository leaves them
//  out.
_.getAll = async (req, res) => {
    try {
        // An empty table is an empty array, never a 404.
        const data = service.getAll()
        return res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

/**
 * Answers one live relation by its id.
 * @param {String} req.params.id Id of the relation, as the string every route parameter is.
 */
_.getById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'relation invalid' })

        // A deleted relation answers exactly like one that never existed.
        const data = service.getById(id)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'relation not found' })

        return res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

/**
 * Answers every live relation that names an entity on either side.
 * @param {String} req.params.entity The entity name. Checked against the catalogues, because
 *  a name that belongs to no entity is a malformed request rather than an empty answer.
 */
_.getByEntity = async (req, res) => {
    try {
        // A name in none of the catalogues is malformed.
        if (validators.isValidEntity(req.params.entity) === false) {
            return res.status(400).json({ status: 'warning', description: 'relation entity invalid' })
        }

        // Note: an empty array is a real answer here, never a 404.
        const data = service.getByEntity(req.params.entity)
        return res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

/**
 * Answers every live relation that mentions a record id on either side.
 * @param {String} req.params.id The record id, coerced and checked like every route id.
 */
_.getByEntityId = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'relation invalid' })

        // Note: the one id lookup that answers 200 with an empty array instead of 404. It asks
        //  "what relates to this?", and "nothing" is a real answer.
        const data = service.getByEntityId(id)
        return res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

/**
 * Creates a relation, or brings back its deleted twin.
 * @param {Number} req.body.id_1 Id of the record on the first side.
 * @param {String} req.body.entity_1 Name of the entity owning id_1.
 * @param {Number} req.body.id_2 Id of the record on the second side.
 * @param {String} req.body.entity_2 Name of the entity owning id_2.
 * @param {String} req.body.relation_type One of the catalogue verbs.
 * @param {String} req.body.note Optional. Free text saying what the link means.
 */
_.post = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validatePost(req.body) === false) return res.status(400).json({ status: 'warning', description: 'relation invalid' })

        // The service owns the model: the controller never fills one field by field.
        const relation = service.buildForCreate(req.body)

        // Both ends must be entities that own a table: an entity with none has no record to
        //  point at.
        if (service.isEntityRelatable(relation.entity_1) === false || service.isEntityRelatable(relation.entity_2) === false) {
            return res.status(400).json({ status: 'warning', description: 'relation entity invalid' })
        }

        // A record linked to itself means nothing.
        if (service.isReflexive(relation) === true) {
            return res.status(400).json({ status: 'warning', description: 'relation reflexive' })
        }

        // A live link with the same ends and type already says this.
        if (service.isLinkTaken(relation) === true) {
            return res.status(409).json({ status: 'warning', description: 'relation already exists' })
        }

        // A deleted twin is brought back instead of duplicated. For the client it is a
        //  creation, and the answer says so.
        const revived = service.reviveDeletedTwin(relation)
        if (revived !== null) return res.status(201).json({ status: 'success', description: 'relation created', data: revived })

        // Nothing to revive: a plain create. The stored row travels back, generated id included.
        const created = service.create(relation)
        return res.status(201).json({ status: 'success', description: 'relation created', data: created })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation creation failed' })
    }
}

/**
 * Replaces a live relation. An update writes the whole row, so a client changing one field
 *  sends every other one back untouched.
 * @param {Number} req.body.id Id of the relation to write.
 * @param {Number} req.body.id_1 Id of the record on the first side.
 * @param {String} req.body.entity_1 Name of the entity owning id_1.
 * @param {Number} req.body.id_2 Id of the record on the second side.
 * @param {String} req.body.entity_2 Name of the entity owning id_2.
 * @param {String} req.body.relation_type One of the catalogue verbs.
 * @param {String} req.body.note Optional. Free text, or null.
 */
_.update = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateUpdate(req.body) === false) return res.status(400).json({ status: 'warning', description: 'relation invalid' })

        // Read first, so a missing or deleted relation is a 404 before any guard runs.
        const current = service.getById(req.body.id)
        if (current === null) return res.status(404).json({ status: 'warning', description: 'relation not found' })

        // The service owns the model.
        const relation = service.buildForUpdate(req.body)

        // The same three guards as a create, the duplicate one ignoring the relation itself.
        if (service.isEntityRelatable(relation.entity_1) === false || service.isEntityRelatable(relation.entity_2) === false) {
            return res.status(400).json({ status: 'warning', description: 'relation entity invalid' })
        }
        if (service.isReflexive(relation) === true) {
            return res.status(400).json({ status: 'warning', description: 'relation reflexive' })
        }
        if (service.isLinkTakenByAnother(relation) === true) {
            return res.status(409).json({ status: 'warning', description: 'relation already exists' })
        }

        // The stored row travels back as it now stands.
        const updated = service.update(relation)
        return res.status(200).json({ status: 'success', description: 'relation updated', data: updated })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation update failed' })
    }
}

/**
 * Deletes a live relation. From then on no route sees it, and only its id comes back.
 * @param {String} req.params.id Id of the relation, as the string every route parameter is.
 */
_.deleteById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'relation invalid' })

        // One statement deletes the relation and says whether there was a live one: a missing
        //  one and an already deleted one both answer 404, and the first stamp never moves.
        const deleted_id = service.softDelete(id)
        if (deleted_id === null) return res.status(404).json({ status: 'warning', description: 'relation not found' })

        // A deleted record never travels to the client: its id is the whole answer.
        return res.status(200).json({ status: 'success', description: 'relation deleted', data: deleted_id })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'relation deletion failed' })
    }
}

module.exports = _
