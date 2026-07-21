const validators = require('./validators')
const repository = require('./repository')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = repository.getAll()
        res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const data = repository.getById(req.params.id)
        if (!data) return res.status(404).json({ status: 'failed', description: 'metadata not found' })
        res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

_.getByName = async (req, res) => {
    try {
        const data = repository.getByName(req.params.name)
        if (!data) return res.status(404).json({ status: 'failed', description: 'metadata not found' })
        res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })
        const current = repository.getById(req.body.id)
        const metadata = service.buildForUpdate(current, req.body)
        repository.update(metadata)
        res.status(200).json({ status: 'success', description: 'metadata updated' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'metadata update failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })
        const metadata = service.buildForCreate(req.body)
        repository.post(metadata)
        res.status(201).json({ status: 'success', description: 'metadata created' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'metadata creation failed' })
    }
}

_.deleteByName = async (req, res) => {
    try {
        repository.deleteByName(req.params.name)
        res.status(200).json({ status: 'success', description: 'metadata deleted' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'metadata deletion failed' })
    }
}

module.exports = _
