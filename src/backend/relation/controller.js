const Relation = require('./model')
const validators = require('./validators')
const repository = require('./repository')
const { SYSTEM_ENTITIES } = require('../core/constants')
const { RELATION_TYPES } = require('./types-of-relation')

const _ = {}

_.validate = (relation) => {
    if (!validators.isNumber(relation.id)) return false
    if (!validators.isNumber(relation.id_1)) return false
    if (!validators.isString(relation.entity_1)) return false
    if (!validators.isValidEntity(relation.entity_1)) return false
    if (!validators.isNumber(relation.id_2)) return false
    if (!validators.isString(relation.entity_2)) return false
    if (!validators.isValidEntity(relation.entity_2)) return false
    if (!validators.isString(relation.relation_type)) return false
    if (!validators.isValidRelationType(relation.relation_type)) return false
    if (!validators.isNullableString(relation.note)) return false
    return true
}

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
        const data = repository.getById(Number(req.params.id))
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
        const data = repository.getByEntityId(Number(req.params.id))
        res.status(200).json({ status: 'success', description: 'relation retrieved', data })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation retrieval failed' })
    }
}

_.post = async (req, res) => {
    try {
        const relation = new Relation()
        relation.setClass(
            req.body.id,
            req.body.id_1,
            req.body.entity_1,
            req.body.id_2,
            req.body.entity_2,
            req.body.relation_type,
            req.body.note
        )
        if (!_.validate(relation)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        repository.post(relation)
        res.status(201).json({ status: 'success', description: 'relation created' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation creation failed' })
    }
}

_.update = async (req, res) => {
    try {
        const relation = new Relation()
        relation.setClass(
            req.body.id,
            req.body.id_1,
            req.body.entity_1,
            req.body.id_2,
            req.body.entity_2,
            req.body.relation_type,
            req.body.note
        )
        if (!_.validate(relation)) return res.status(400).json({ status: 'warning', description: 'relation invalid' })
        if (!repository.getById(relation.id)) {
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
        repository.deleteById(Number(req.params.id))
        res.status(200).json({ status: 'success', description: 'relation deleted' })
    } catch (e) {
        res.status(500).json({ status: 'failed', description: 'relation deletion failed' })
    }
}

module.exports = _
