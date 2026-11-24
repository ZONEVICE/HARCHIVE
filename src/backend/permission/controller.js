// =====================================================================================
// IMPORTS.
//
//  Two, and never a third: a controller imports its validators and its service.
// =====================================================================================

// The request predicates and validators of this entity.
const validators = require('./validators')

// The only way this file reaches the data.
const service = require('./service')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// ROUTE CONTROLLERS.
// =====================================================================================

// Answers every live permission. Deleted ones never reach this list: the repository leaves
//  them out.
_.getAll = async (req, res) => {
    try {
        // An empty table is an empty array, never a 404.
        const data = service.getAll()
        return res.status(200).json({ status: 'success', description: 'permission retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'permission retrieval failed' })
    }
}

/**
 * Answers one live permission by its id.
 * @param {String} req.params.id Id of the permission, as the string every route parameter is.
 */
_.getById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'permission invalid' })

        // A deleted permission answers exactly like one that never existed.
        const data = service.getById(id)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'permission not found' })

        return res.status(200).json({ status: 'success', description: 'permission retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'permission retrieval failed' })
    }
}

/**
 * Answers one live permission by its name.
 * @param {String} req.params.name The name to look up. The service normalises it, so any casing
 *  or accent shape the client typed resolves the same permission.
 */
_.getByName = async (req, res) => {
    try {
        // No coercion: a name is the string the route parameter already is.
        const data = service.getByName(req.params.name)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'permission not found' })

        return res.status(200).json({ status: 'success', description: 'permission retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'permission retrieval failed' })
    }
}

/**
 * Creates a permission.
 * @param {String} req.body.name The name. Must be free among live and deleted permissions alike.
 * @param {String} req.body.entity Optional. The entity the flags apply to; absent or null is
 *  every entity.
 * @param {Boolean} req.body.can_read Optional. Absent is false.
 * @param {Boolean} req.body.can_create Optional. Absent is false.
 * @param {Boolean} req.body.can_edit Optional. Absent is false.
 * @param {Boolean} req.body.can_delete Optional. Absent is false.
 */
_.post = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validatePost(req.body) === false) return res.status(400).json({ status: 'warning', description: 'permission invalid' })

        // The service owns the model and the normalisation of the name.
        const permission = service.buildForCreate(req.body)

        // A name held by a live permission, or by a deleted one, is a 409 and never a 500 from the
        //  UNIQUE column. The two get different descriptions so the client can explain them.
        if (service.isNameTaken(permission.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'permission already exists' })
        }
        if (service.isNameHeldByDeleted(permission.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'permission name held by a deleted record' })
        }

        // The stored row travels back, generated id included.
        const created = service.create(permission)
        return res.status(201).json({ status: 'success', description: 'permission created', data: created })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'permission creation failed' })
    }
}

/**
 * Replaces a live permission. An update writes the whole row, so every field is required —
 *  the scope included, since an omitted one would silently widen it to every entity.
 * @param {Number} req.body.id Id of the permission to write.
 * @param {String} req.body.name The name. May stay its own, may not take another's.
 * @param {String} req.body.entity The entity the flags apply to, or null for every entity.
 * @param {Boolean} req.body.can_read Whether the holder may read.
 * @param {Boolean} req.body.can_create Whether the holder may create.
 * @param {Boolean} req.body.can_edit Whether the holder may edit.
 * @param {Boolean} req.body.can_delete Whether the holder may delete.
 */
_.update = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateUpdate(req.body) === false) return res.status(400).json({ status: 'warning', description: 'permission invalid' })

        // Read first, so a missing or deleted permission is a 404 before any guard runs.
        const current = service.getById(req.body.id)
        if (current === null) return res.status(404).json({ status: 'warning', description: 'permission not found' })

        // The service owns the model and the normalisation of the name.
        const permission = service.buildForUpdate(req.body)

        // Renaming onto a name another live permission holds is a conflict; keeping its own is not.
        if (service.isNameTakenByAnother(permission.name, permission.id) === true) {
            return res.status(409).json({ status: 'warning', description: 'permission already exists' })
        }
        if (service.isNameHeldByDeleted(permission.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'permission name held by a deleted record' })
        }

        // The stored row travels back as it now stands.
        const updated = service.update(permission)
        return res.status(200).json({ status: 'success', description: 'permission updated', data: updated })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'permission update failed' })
    }
}

/**
 * Deletes a live permission. From then on no route sees it, and only its id comes back.
 * @param {String} req.params.id Id of the permission, as the string every route parameter is.
 */
_.deleteById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'permission invalid' })

        // One statement deletes the permission and says whether there was a live one: a missing
        //  permission and an already deleted one both answer 404, and the first stamp never moves.
        const deleted_id = service.softDelete(id)
        if (deleted_id === null) return res.status(404).json({ status: 'warning', description: 'permission not found' })

        // A deleted record never travels to the client: its id is the whole answer.
        return res.status(200).json({ status: 'success', description: 'permission deleted', data: deleted_id })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'permission deletion failed' })
    }
}

module.exports = _
