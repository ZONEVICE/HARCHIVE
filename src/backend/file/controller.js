const validators = require('./validators')
const service = require('./service')

const _ = {}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        const data = service.getById(id)
        if (!data) return res.status(404).json({ status: 'warning', description: 'file not found' })
        res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
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
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'file creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        const current = service.getById(req.body.id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'file not found' })
        const file = service.buildForUpdate(current, req.body)
        service.update(file)
        res.status(200).json({ status: 'success', description: 'file updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'file update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        const current = service.getById(id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'file not found' })
        service.softDelete(id)
        res.status(200).json({ status: 'success', description: 'file deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'file deletion failed' })
    }
}

module.exports = _
