const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'permission retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'permission retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const data = service.getById(req.params.id)
        if (!data) return res.status(404).json({ status: 'failed', description: 'permission not found' })
        res.status(200).json({ status: 'success', description: 'permission retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'permission retrieval failed' })
    }
}

_.getByName = async (req, res) => {
    try {
        const data = service.getByName(req.params.name)
        if (!data) return res.status(404).json({ status: 'failed', description: 'permission not found' })
        res.status(200).json({ status: 'success', description: 'permission retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'permission retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'permission invalid' })
        const permission = service.buildForCreate(req.body)
        if (service.isNameTaken(permission.name)) {
            return res.status(409).json({ status: 'warning', description: 'permission already exists' })
        }
        service.create(permission)
        res.status(201).json({ status: 'success', description: 'permission created' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'permission creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'permission invalid' })
        const current = service.getById(req.body.id)
        if (!current) return res.status(404).json({ status: 'failed', description: 'permission not found' })
        const permission = service.buildForUpdate(current, req.body)
        if (service.isNameTakenByAnother(permission.name, permission.id)) {
            return res.status(409).json({ status: 'warning', description: 'permission already exists' })
        }
        service.update(permission)
        res.status(200).json({ status: 'success', description: 'permission updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'permission update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        service.softDelete(req.params.id)
        res.status(200).json({ status: 'success', description: 'permission deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'permission deletion failed' })
    }
}

module.exports = _
