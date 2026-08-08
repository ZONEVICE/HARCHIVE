const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'workspace retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'workspace retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })
        const data = service.getById(id)
        if (!data) return res.status(404).json({ status: 'warning', description: 'workspace not found' })
        res.status(200).json({ status: 'success', description: 'workspace retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'workspace retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })
        const workspace = service.buildForCreate(req.body)
        if (service.isPathTaken(workspace.path_absolute)) {
            return res.status(409).json({ status: 'warning', description: 'workspace already exists' })
        }
        service.create(workspace)
        res.status(201).json({ status: 'success', description: 'workspace created' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'workspace creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })
        const current = service.getById(req.body.id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'workspace not found' })
        const workspace = service.buildForUpdate(current, req.body)
        if (service.isPathTakenByAnother(workspace.path_absolute, workspace.id)) {
            return res.status(409).json({ status: 'warning', description: 'workspace already exists' })
        }
        service.update(workspace)
        res.status(200).json({ status: 'success', description: 'workspace updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'workspace update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'workspace invalid' })
        const current = service.getById(id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'workspace not found' })
        service.softDelete(id)
        res.status(200).json({ status: 'success', description: 'workspace deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'workspace deletion failed' })
    }
}

module.exports = _
