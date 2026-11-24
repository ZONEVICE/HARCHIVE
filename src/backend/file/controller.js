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

// Answers every live file. Deleted ones never reach this list: the repository leaves them
//  out.
_.getAll = async (req, res) => {
    try {
        // An empty table is an empty array, never a 404.
        const data = service.getAll()
        return res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

/**
 * Answers one live file by its id.
 * @param {String} req.params.id Id of the file, as the string every route parameter is.
 */
_.getById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'file invalid' })

        // A deleted file answers exactly like one that never existed.
        const data = service.getById(id)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'file not found' })

        return res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

/**
 * Creates a file.
 * @param {String} req.body.name The file name.
 * @param {String} req.body.hash_256_sha The SHA-256 of the contents.
 * @param {String} req.body.relative_path The path inside its workspace.
 * @param {String} req.body.extension The extension.
 */
_.post = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validatePost(req.body) === false) return res.status(400).json({ status: 'warning', description: 'file invalid' })

        // The service owns the model: the controller never fills one field by field.
        const file = service.buildForCreate(req.body)

        // The stored row travels back, generated id included.
        const created = service.create(file)
        return res.status(201).json({ status: 'success', description: 'file created', data: created })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'file creation failed' })
    }
}

/**
 * Replaces a live file. An update writes the whole row, so every field is sent.
 * @param {Number} req.body.id Id of the file to write.
 * @param {String} req.body.name The file name.
 * @param {String} req.body.hash_256_sha The SHA-256 of the contents.
 * @param {String} req.body.relative_path The path inside its workspace.
 * @param {String} req.body.extension The extension.
 */
_.update = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateUpdate(req.body) === false) return res.status(400).json({ status: 'warning', description: 'file invalid' })

        // Read first, so a missing or deleted file is a 404 before anything else runs.
        const current = service.getById(req.body.id)
        if (current === null) return res.status(404).json({ status: 'warning', description: 'file not found' })

        // The service owns the model: the controller never fills one field by field.
        const file = service.buildForUpdate(req.body)

        // The stored row travels back as it now stands.
        const updated = service.update(file)
        return res.status(200).json({ status: 'success', description: 'file updated', data: updated })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'file update failed' })
    }
}

/**
 * Deletes a live file. From then on no route sees it, and only its id comes back.
 * @param {String} req.params.id Id of the file, as the string every route parameter is.
 */
_.deleteById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'file invalid' })

        // One statement deletes the file and says whether there was a live one: a missing one
        //  and an already deleted one both answer 404, and the first stamp never moves.
        const deleted_id = service.softDelete(id)
        if (deleted_id === null) return res.status(404).json({ status: 'warning', description: 'file not found' })

        // A deleted record never travels to the client: its id is the whole answer.
        return res.status(200).json({ status: 'success', description: 'file deleted', data: deleted_id })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'file deletion failed' })
    }
}

module.exports = _
