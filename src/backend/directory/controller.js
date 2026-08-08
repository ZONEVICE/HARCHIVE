const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'directory retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'directory retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'directory invalid' })
        const data = service.getById(id)
        if (!data) return res.status(404).json({ status: 'warning', description: 'directory not found' })
        res.status(200).json({ status: 'success', description: 'directory retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'directory retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'directory invalid' })
        const directory = service.buildForCreate(req.body)
        service.create(directory)
        res.status(201).json({ status: 'success', description: 'directory created' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'directory creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'directory invalid' })
        const current = service.getById(req.body.id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'directory not found' })
        const directory = service.buildForUpdate(current, req.body)
        service.update(directory)
        res.status(200).json({ status: 'success', description: 'directory updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'directory update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'directory invalid' })
        const current = service.getById(id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'directory not found' })
        service.softDelete(id)
        res.status(200).json({ status: 'success', description: 'directory deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'directory deletion failed' })
    }
}

module.exports = _
