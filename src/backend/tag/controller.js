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

// Answers every live tag. Deleted ones never reach this list: the repository leaves them out.
_.getAll = async (req, res) => {
    try {
        // An empty table is an empty array, never a 404.
        const data = service.getAll()
        return res.status(200).json({ status: 'success', description: 'tag retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'tag retrieval failed' })
    }
}

/**
 * Answers one live tag by its id.
 * @param {String} req.params.id Id of the tag, as the string every route parameter is.
 */
_.getById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'tag invalid' })

        // A deleted tag answers exactly like one that never existed.
        const data = service.getById(id)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'tag not found' })

        return res.status(200).json({ status: 'success', description: 'tag retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'tag retrieval failed' })
    }
}

/**
 * Answers one live tag by its name.
 * @param {String} req.params.name The name to look up. The service normalises it, so any casing
 *  or accent shape the client typed resolves the same tag.
 */
_.getByName = async (req, res) => {
    try {
        // No coercion: a name is the string the route parameter already is.
        const data = service.getByName(req.params.name)
        if (data === null) return res.status(404).json({ status: 'warning', description: 'tag not found' })

        return res.status(200).json({ status: 'success', description: 'tag retrieved', data })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'tag retrieval failed' })
    }
}

/**
 * Creates a tag.
 * @param {String} req.body.name The name. Must be free among live and deleted tags alike.
 * @param {String} req.body.metadata Optional. The JSON blob, as text.
 */
_.post = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validatePost(req.body) === false) return res.status(400).json({ status: 'warning', description: 'tag invalid' })

        // The service owns the model and the normalisation of the name.
        const tag = service.buildForCreate(req.body)

        // A name held by a live tag, or by a deleted one, is a 409 and never a 500 from the
        //  UNIQUE column. The two get different descriptions so the client can explain them.
        if (service.isNameTaken(tag.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'tag already exists' })
        }
        if (service.isNameHeldByDeleted(tag.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'tag name held by a deleted record' })
        }

        // The stored row travels back, generated id included.
        const created = service.create(tag)
        return res.status(201).json({ status: 'success', description: 'tag created', data: created })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'tag creation failed' })
    }
}

/**
 * Replaces a live tag. An update writes the whole row, so every field is required.
 * @param {Number} req.body.id Id of the tag to write.
 * @param {String} req.body.name The name. May stay its own, may not take another's.
 * @param {String} req.body.metadata The JSON blob, as text.
 */
_.update = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateUpdate(req.body) === false) return res.status(400).json({ status: 'warning', description: 'tag invalid' })

        // Read first, so a missing or deleted tag is a 404 before any guard runs.
        const current = service.getById(req.body.id)
        if (current === null) return res.status(404).json({ status: 'warning', description: 'tag not found' })

        // The service owns the model and the normalisation of the name.
        const tag = service.buildForUpdate(req.body)

        // Renaming onto a name another live tag holds is a conflict; keeping its own is not.
        if (service.isNameTakenByAnother(tag.name, tag.id) === true) {
            return res.status(409).json({ status: 'warning', description: 'tag already exists' })
        }
        if (service.isNameHeldByDeleted(tag.name) === true) {
            return res.status(409).json({ status: 'warning', description: 'tag name held by a deleted record' })
        }

        // The stored row travels back as it now stands.
        const updated = service.update(tag)
        return res.status(200).json({ status: 'success', description: 'tag updated', data: updated })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'tag update failed' })
    }
}

/**
 * Deletes a live tag. From then on no route sees it, and only its id comes back.
 * @param {String} req.params.id Id of the tag, as the string every route parameter is.
 */
_.deleteById = async (req, res) => {
    try {
        // A non-numeric segment becomes NaN, which is a malformed request rather than a miss.
        const id = Number(req.params.id)
        if (validators.isId(id) === false) return res.status(400).json({ status: 'warning', description: 'tag invalid' })

        // One statement deletes the tag and says whether there was a live one: a missing tag
        //  and an already deleted one both answer 404, and the first stamp never moves.
        const deleted_id = service.softDelete(id)
        if (deleted_id === null) return res.status(404).json({ status: 'warning', description: 'tag not found' })

        // A deleted record never travels to the client: its id is the whole answer.
        return res.status(200).json({ status: 'success', description: 'tag deleted', data: deleted_id })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'tag deletion failed' })
    }
}

module.exports = _
