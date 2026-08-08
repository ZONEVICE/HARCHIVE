const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })
        const data = service.getById(id)
        if (!data) return res.status(404).json({ status: 'warning', description: 'metadata not found' })
        res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

_.getByName = async (req, res) => {
    try {
        const data = service.getByName(req.params.name)
        if (!data) return res.status(404).json({ status: 'warning', description: 'metadata not found' })
        res.status(200).json({ status: 'success', description: 'metadata retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'metadata retrieval failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })
        const current = service.getById(req.body.id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'metadata not found' })
        const metadata = service.buildForUpdate(current, req.body)
        if (service.isNameTakenByAnother(metadata.name, metadata.id)) {
            return res.status(409).json({ status: 'warning', description: 'metadata already exists' })
        }
        service.update(metadata)
        res.status(200).json({ status: 'success', description: 'metadata updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'metadata update failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'metadata invalid' })
        const metadata = service.buildForCreate(req.body)
        if (service.isNameTaken(metadata.name)) {
            return res.status(409).json({ status: 'warning', description: 'metadata already exists' })
        }
        service.create(metadata)
        res.status(201).json({ status: 'success', description: 'metadata created' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'metadata creation failed' })
    }
}

_.deleteByName = async (req, res) => {
    try {
        const current = service.getByName(req.params.name)
        if (!current) return res.status(404).json({ status: 'warning', description: 'metadata not found' })
        service.softDeleteByName(req.params.name)
        res.status(200).json({ status: 'success', description: 'metadata deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'metadata deletion failed' })
    }
}

module.exports = _
