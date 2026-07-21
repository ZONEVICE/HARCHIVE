const validators = require('./validators')
const repository = require('./repository')
const { SYSTEM_ENTITIES } = require('../core/constants')
const { RELATION_TYPES } = require('./types-of-relation')
const service = require('./service')

const _ = {}

_.getEntities = async (req, res) => {
    try {
        res.status(200).json({ status: 'success', description: 'relation entities retrieved', data: SYSTEM_ENTITIES })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation entities retrieval failed' })
    }
}

_.getTypes = async (req, res) => {
    try {
        res.status(200).json({ status: 'success', description: 'relation types retrieved', data: RELATION_TYPES })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation types retrieval failed' })
    }
}

_.getAll = async (req, res) => {
    try {
        const data = repository.getAll()
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const data = repository.getById(req.params.id)
        if (!data) return res.status(404).json({ status: 'failed', description: 'relation not found' })
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.getByEntity = async (req, res) => {
    try {
        if (!validators.isValidEntity(req.params.entity)) {
            return res.status(400).json({ status: 'warning', description: 'relation entity invalid' })
        }
        const data = repository.getByEntity(req.params.entity)
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.getByEntityId = async (req, res) => {
    try {
        const data = repository.getByEntityId(req.params.id)
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const relation = service.buildForCreate(req.body)
        repository.post(relation)
        res.status(201).json({ status: 'success', description: 'relation created' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const current = repository.getById(req.body.id)
        const relation = service.buildForUpdate(current, req.body)
        if (!current) {
            return res.status(404).json({ status: 'failed', description: 'relation not found' })
        }
        repository.update(relation)
        res.status(200).json({ status: 'success', description: 'relation updated' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        repository.deleteById(req.params.id)
        res.status(200).json({ status: 'success', description: 'relation deleted' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation deletion failed' })
    }
}

module.exports = _
