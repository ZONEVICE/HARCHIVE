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

// Answers every live metadata record. Deleted ones never reach this list: the repository
//  leaves them out.
_.getAll = async (req, res) => {
    try {
        // An empty table is an empty array, never a 404.
        const data = service.getAll()
        return res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

/**
 * Answers one live metadata record by its id.
 * @param {String} req.params.id Id of the record, as the string every route parameter is.
 */
_.getById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })

        // A deleted record answers exactly like one that never existed.
        const data = service.getById(id)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'metadata not found' })

        return res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

/**
 * Answers one live metadata record by its name.
 * @param {String} req.params.name The name to look up. The service normalises it, so any casing
 *  or accent shape the client typed resolves the same record.
 */
_.getByName = async (req, res) => {
    try {
        // No coercion: a name is the string the route parameter already is.
        const data = service.getByName(req.params.name)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'metadata not found' })

        return res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

/**
 * Creates a metadata record.
 * @param {String} req.body.name The name. Must be free among live and deleted records alike.
 * @param {String} req.body.value The value, stored exactly as it arrives.
 */
_.post = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validatePost(req.body) === false) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })

        // The service owns the model and the normalisation of the name.
        const metadata = service.buildForCreate(req.body)

        // A name held by a live record, or by a deleted one, is a 409 and never a 500 from the
        //  UNIQUE column. The two get different descriptions so the client can explain them.
        if (service.isNameTaken(metadata.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'metadata already exists' })
        }
        if (service.isNameHeldByDeleted(metadata.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'metadata name held by a deleted record' })
        }

        // The stored row travels back, generated id included.
        const created = service.create(metadata)
        return res.status(201).json({ status: 'success', description: 'metadata created', data: created })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'metadata creation failed' })
    }
}

/**
 * Replaces a live metadata record. An update writes the whole row, so every field is required.
 * @param {Number} req.body.id Id of the record to write.
 * @param {String} req.body.name The name. May stay its own, may not take another's.
 * @param {String} req.body.value The value, stored exactly as it arrives.
 */
_.update = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateUpdate(req.body) === false) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })

        // Read first, so a missing or deleted record is a 404 before any guard runs.
        const current = service.getById(req.body.id)
        if (current === null) return res.status(404).json({ status: 'warning', description: 'metadata not found' })

        // The service owns the model and the normalisation of the name.
        const metadata = service.buildForUpdate(req.body)

        // Renaming onto a name another live record holds is a conflict; keeping its own is not.
        if (service.isNameTakenByAnother(metadata.name, metadata.id) === true) {
            return res.status(409).json({ status: 'warning', description: 'metadata already exists' })
        }
        if (service.isNameHeldByDeleted(metadata.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'metadata name held by a deleted record' })
        }

        // The stored row travels back as it now stands.
        const updated = service.update(metadata)
        return res.status(200).json({ status: 'success', description: 'metadata updated', data: updated })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'metadata update failed' })
    }
}

/**
 * Deletes a live metadata record by its name. From then on no route sees it, and only its id
 *  comes back.
 * @param {String} req.params.name The name, in any casing the client typed.
 */
_.deleteByName = async (req, res) => {
    try {
        // Note: no Number() and no isId here. The name arrives as the string it is, and the
        //  service normalises it, so any casing deletes the same record.
        const deleted_id = service.softDeleteByName(req.params.name)
        if (deleted_id === null) return res.status(404).json({ status: 'warning', description: 'metadata not found' })

        // A deleted record never travels to the client: its id is the whole answer.
        return res.status(200).json({ status: 'success', description: 'metadata deleted', data: deleted_id })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'metadata deletion failed' })
    }
}

module.exports = _
