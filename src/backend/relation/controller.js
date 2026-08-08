const validators = require('./validators')
const { SYSTEM_ENTITIES } = require('../core/constants')
const { RELATION_TYPES } = require('./types-of-relation')
const service = require('./service')

const _ = {}

_.getEntities = async (req, res) => {
    try {
        res.status(200).json({ status: 'success', description: 'relation entities retrieved', data: SYSTEM_ENTITIES })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation entities retrieval failed' })
    }
}

_.getTypes = async (req, res) => {
    try {
        res.status(200).json({ status: 'success', description: 'relation types retrieved', data: RELATION_TYPES })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation types retrieval failed' })
    }
}

_.getAll = async (req, res) => {
    try {
        const data = service.getAll()
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.getById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const data = service.getById(id)
        if (!data) return res.status(404).json({ status: 'warning', description: 'relation not found' })
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.getByEntity = async (req, res) => {
    try {
        if (!validators.isValidEntity(req.params.entity)) {
            return res.status(400).json({ status: 'warning', description: 'relation entity invalid' })
        }
        const data = service.getByEntity(req.params.entity)
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

// This one lists whatever relations mention an id, so an id nothing points at is an empty list
//  and not a 404: the question is "what relates to this?", and "nothing" is a valid answer.
_.getByEntityId = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const data = service.getByEntityId(id)
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        if (!validators.validatePost(req.body)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const relation = service.buildForCreate(req.body)
        service.create(relation)
        res.status(201).json({ status: 'success', description: 'relation created' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        if (!validators.validateUpdate(req.body)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const current = service.getById(req.body.id)
        if (!current) {
            return res.status(404).json({ status: 'warning', description: 'relation not found' })
        }
        const relation = service.buildForUpdate(current, req.body)
        service.update(relation)
        res.status(200).json({ status: 'success', description: 'relation updated' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation update failed' })
    }
}

_.deleteById = async (req, res) => {
    try {
        const id = Number(req.params.id)
        if (!validators.isId(id)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        const current = service.getById(id)
        if (!current) return res.status(404).json({ status: 'warning', description: 'relation not found' })
        service.softDelete(id)
        res.status(200).json({ status: 'success', description: 'relation deleted' })
    } catch (e) {
        console.error('Error:', e.message)
        res.status(500).json({ status: 'failed', description: 'relation deletion failed' })
    }
}

module.exports = _
