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

// Answers every live workspace. Deleted ones never reach this list: the repository leaves them
//  out.
_.getAll = async (req, res) => {
    try {
        // An empty table is an empty array, never a 404.
        const data = service.getAll()
        return res.status(200).json({ status: 'success', description: 'workspace retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'workspace retrieval failed' })
    }
}

/**
 * Answers one live workspace by its id.
 * @param {String} req.params.id Id of the workspace, as the string every route parameter is.
 */
_.getById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })

        // A deleted workspace answers exactly like one that never existed.
        const data = service.getById(id)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'workspace not found' })

        return res.status(200).json({ status: 'success', description: 'workspace retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'workspace retrieval failed' })
    }
}

/**
 * Creates a workspace.
 * @param {String} req.body.name The display name.
 * @param {String} req.body.path_absolute The absolute directory, normalised on the way in.
 * @param {String} req.body.path_relative The relative path, stored as it arrived.
 */
_.post = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validatePost(req.body) === false) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })

        // The service owns the model and the normalisation of the path.
        const workspace = service.buildForCreate(req.body)

        // A path held by a live workspace, or by a deleted one, is a 409 and never a 500 from
        //  the UNIQUE column. The two get different descriptions so the client can explain them.
        if (service.isPathTaken(workspace.path_absolute) === true) {
            return res.status(409).json({ status: 'warning', description: 'workspace already exists' })
        }
        if (service.isPathHeldByDeleted(workspace.path_absolute) === true) {
            return res.status(409).json({ status: 'warning', description: 'workspace path held by a deleted record' })
        }

        // The stored row travels back, generated id included.
        const created = service.create(workspace)
        return res.status(201).json({ status: 'success', description: 'workspace created', data: created })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'workspace creation failed' })
    }
}

/**
 * Replaces a live workspace. An update writes the whole row, so every field is sent.
 * @param {Number} req.body.id Id of the workspace to write.
 * @param {String} req.body.name The display name.
 * @param {String} req.body.path_absolute The absolute directory, normalised on the way in.
 * @param {String} req.body.path_relative The relative path, stored as it arrived.
 */
_.update = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateUpdate(req.body) === false) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })

        // Read first, so a missing or deleted workspace is a 404 before anything else runs.
        const current = service.getById(req.body.id)
        if (current === null) return res.status(404).json({ status: 'warning', description: 'workspace not found' })

        // The service owns the model and the normalisation of the path.
        const workspace = service.buildForUpdate(req.body)

        // Moving onto a path another live workspace holds is a conflict; keeping its own is not.
        if (service.isPathTakenByAnother(workspace.path_absolute, workspace.id) === true) {
            return res.status(409).json({ status: 'warning', description: 'workspace already exists' })
        }
        if (service.isPathHeldByDeleted(workspace.path_absolute) === true) {
            return res.status(409).json({ status: 'warning', description: 'workspace path held by a deleted record' })
        }

        // The stored row travels back as it now stands.
        const updated = service.update(workspace)
        return res.status(200).json({ status: 'success', description: 'workspace updated', data: updated })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'workspace update failed' })
    }
}

/**
 * Deletes a live workspace. From then on no route sees it, and only its id comes back.
 * @param {String} req.params.id Id of the workspace, as the string every route parameter is.
 */
_.deleteById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })

        // One statement deletes the workspace and says whether there was a live one: a missing one
        //  and an already deleted one both answer 404, and the first stamp never moves.
        const deleted_id = service.softDelete(id)
        if (deleted_id === null) return res.status(404).json({ status: 'warning', description: 'workspace not found' })

        // A deleted record never travels to the client: its id is the whole answer.
        return res.status(200).json({ status: 'success', description: 'workspace deleted', data: deleted_id })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'workspace deletion failed' })
    }
}

module.exports = _
