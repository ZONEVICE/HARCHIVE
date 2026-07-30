const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'tag retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'tag retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const data = service.getById(req.params.id)
        if (!data) return res.status(404).json({ status: 'failed', description: 'tag not found' })
        res.status(200).json({ status: 'success', description: 'tag retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'tag retrieval failed' })
    }
}

_.getByName = async (req, res) => {
    try {
        const data = service.getByName(req.params.name)
        if (!data) return res.status(404).json({ status: 'failed', description: 'tag not found' })
        res.status(200).json({ status: 'success', description: 'tag retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'tag retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'tag invalid' })
        const tag = service.buildForCreate(req.body)
        if (service.isNameTaken(tag.name)) {
            return res.status(409).json({ status: 'warning', description: 'tag already exists' })
        }
        service.create(tag)
        res.status(201).json({ status: 'success', description: 'tag created' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'tag creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'tag invalid' })
        const current = service.getById(req.body.id)
        const tag = service.buildForUpdate(current, req.body)
        if (!current) {
            return res.status(404).json({ status: 'failed', description: 'tag not found' })
        }
        if (service.isNameTakenByAnother(tag.name, tag.id)) {
            return res.status(409).json({ status: 'warning', description: 'tag already exists' })
        }
        service.update(tag)
        res.status(200).json({ status: 'success', description: 'tag updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'tag update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        service.softDelete(req.params.id)
        res.status(200).json({ status: 'success', description: 'tag deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'tag deletion failed' })
    }
}

module.exports = _
