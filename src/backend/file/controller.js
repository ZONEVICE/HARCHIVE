const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const data = service.getById(req.params.id)
        if (!data) return res.status(404).json({ status: 'failed', description: 'file not found' })
        res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        const file = service.buildForCreate(req.body)
        service.create(file)
        res.status(201).json({ status: 'success', description: 'file created' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        const current = service.getById(req.body.id)
        const file = service.buildForUpdate(current, req.body)
        service.update(file)
        res.status(200).json({ status: 'success', description: 'file updated' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        service.softDelete(req.params.id)
        res.status(200).json({ status: 'success', description: 'file deleted' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file deletion failed' })
    }
}

module.exports = _
