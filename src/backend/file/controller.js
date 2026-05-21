const File = require('./model')
const validators = require('./validators')
const repository = require('./repository')

const _ = {}

_.validate = (file) => {
    if (!validators.isString(file.id)) return false
    if (!validators.isString(file.name)) return false
    if (!validators.isString(file.hash_256_sha)) return false
    if (!validators.isString(file.relative_path)) return false
    if (!validators.isString(file.extension)) return false
    if (!validators.isArrayOfStrings(file.tags)) return false
    return true
}

_.getAll = async (req, res) => {
    try {
        const data = repository.getAll()
        res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const data = repository.getById(req.params.id)
        if (!data) return res.status(404).json({ status: 'failed', description: 'file not found' })
        res.status(200).json({ status: 'success', description: 'file retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        const file = new File()
        file.name = req.body.name
        file.hash_256_sha = req.body.hash_256_sha
        file.relative_path = req.body.relative_path
        file.extension = req.body.extension
        file.tags = req.body.tags
        if (!_.validate(file)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        repository.post(file)
        res.status(201).json({ status: 'success', description: 'file created' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        const file = new File()
        file.setClass(req.body.id, req.body.name, req.body.hash_256_sha, req.body.relative_path, req.body.extension, req.body.tags)
        if (!_.validate(file)) return res.status(400).json({ status: 'warning', description: 'file invalid' })
        repository.update(file)
        res.status(200).json({ status: 'success', description: 'file updated' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        repository.deleteById(req.params.id)
        res.status(200).json({ status: 'success', description: 'file deleted' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'file deletion failed' })
    }
}

module.exports = _
