const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const { SYSTEM_ENTITIES } = require('../core/constants')
const { RELATION_TYPES } = require('./types-of-relation')

const SAMPLE = {
    id: 9501,
    id_1: 100,
    entity_1: 'file',
    id_2: 200,
    entity_2: 'metadata',
    relation_type: 'linked',
    note: 'File 100 linked to metadata 200'
}

const SECOND_SAMPLE = {
    id: 9502,
    id_1: 100,
    entity_1: 'directory',
    id_2: 300,
    entity_2: 'directory',
    relation_type: 'contains',
    note: 'Directory 100 contains directory 300'
}

beforeAll(async () => {
    await axios.delete(`${URL}/api/relation/id/${SAMPLE.id}`, { validateStatus: () => true })
    await axios.delete(`${URL}/api/relation/id/${SECOND_SAMPLE.id}`, { validateStatus: () => true })
})

describe('GET /api/relation/entities/', () => {
    it('returns 200 with the enumerated list of system entities', async () => {
        const res = await axios.get(`${URL}/api/relation/entities/`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        expect(res.data.data).toEqual(SYSTEM_ENTITIES)
    })
})

describe('GET /api/relation/types/', () => {
    it('returns 200 with the fixed list of relation types', async () => {
        const res = await axios.get(`${URL}/api/relation/types/`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        expect(res.data.data).toEqual(RELATION_TYPES)
    })
})

describe('POST /api/relation/', () => {
    it('returns 400 warning on invalid body (id_1 not a number)', async () => {
        const res = await axios.post(`${URL}/api/relation/`, { ...SAMPLE, id_1: 'x' }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation invalid')
    })

    it('returns 400 warning on entity not in SYSTEM_ENTITIES', async () => {
        const res = await axios.post(`${URL}/api/relation/`, { ...SAMPLE, entity_1: 'not-a-real-entity' }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation invalid')
    })

    it('returns 400 warning on relation_type not in RELATION_TYPES', async () => {
        const res = await axios.post(`${URL}/api/relation/`, { ...SAMPLE, relation_type: 'not-a-real-type' }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation invalid')
    })

    it('returns 400 warning on missing relation_type', async () => {
        const no_type = { ...SAMPLE }
        delete no_type.relation_type
        const res = await axios.post(`${URL}/api/relation/`, no_type, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation invalid')
    })

    it('returns 201 on valid relation', async () => {
        const res = await axios.post(`${URL}/api/relation/`, SAMPLE, { validateStatus: () => true })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation created')
    })

    it('returns 201 on valid relation without note (note is nullable)', async () => {
        const no_note = { ...SECOND_SAMPLE, id: SECOND_SAMPLE.id + 1 }
        delete no_note.note
        const res = await axios.post(`${URL}/api/relation/`, no_note, { validateStatus: () => true })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        await axios.delete(`${URL}/api/relation/id/${no_note.id}`, { validateStatus: () => true })
    })

    it('allows a second relation for the same id_1 and a different id_2 (no uniqueness restriction)', async () => {
        const res = await axios.post(`${URL}/api/relation/`, SECOND_SAMPLE, { validateStatus: () => true })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation created')
    })
})

describe('GET /api/relation/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/relation/`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
    })
})

describe('GET /api/relation/id/:id', () => {
    it('returns 200 with the relation when found', async () => {
        const res = await axios.get(`${URL}/api/relation/id/${SAMPLE.id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(SAMPLE.id)
        expect(res.data.data.entity_1).toBe(SAMPLE.entity_1)
        expect(res.data.data.entity_2).toBe(SAMPLE.entity_2)
        expect(res.data.data.relation_type).toBe(SAMPLE.relation_type)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/relation/id/0`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('relation not found')
    })
})

describe('GET /api/relation/entity/:entity', () => {
    it('returns 200 with relations matching the entity', async () => {
        const res = await axios.get(`${URL}/api/relation/entity/${SAMPLE.entity_1}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        const ids = res.data.data.map(r => r.id)
        expect(ids).toContain(SAMPLE.id)
    })

    it('returns 400 warning when entity is not in SYSTEM_ENTITIES', async () => {
        const res = await axios.get(`${URL}/api/relation/entity/not-a-real-entity`, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation entity invalid')
    })
})

describe('GET /api/relation/entity_id/:id', () => {
    it('returns 200 with relations where the record id appears on either side', async () => {
        const res = await axios.get(`${URL}/api/relation/entity_id/${SAMPLE.id_1}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        const ids = res.data.data.map(r => r.id)
        expect(ids).toContain(SAMPLE.id)
        expect(ids).toContain(SECOND_SAMPLE.id)
    })

    it('returns 200 with empty array when no relation matches', async () => {
        const res = await axios.get(`${URL}/api/relation/entity_id/0`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        expect(res.data.data.length).toBe(0)
    })
})

describe('PUT /api/relation/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.put(`${URL}/api/relation/update/`, { ...SAMPLE, id: 'x' }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('relation invalid')
    })

    it('returns 404 when relation does not exist', async () => {
        const res = await axios.put(`${URL}/api/relation/update/`, { ...SAMPLE, id: 0 }, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('relation not found')
    })

    it('returns 200 on valid update (note and relation_type changed)', async () => {
        const res = await axios.put(`${URL}/api/relation/update/`, { ...SAMPLE, relation_type: 'sibling', note: 'Updated note' }, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation updated')

        const get = await axios.get(`${URL}/api/relation/id/${SAMPLE.id}`, { validateStatus: () => true })
        expect(get.data.data.note).toBe('Updated note')
        expect(get.data.data.relation_type).toBe('sibling')
    })
})

describe('DELETE /api/relation/id/:id', () => {
    it('returns 200 on delete', async () => {
        const res = await axios.delete(`${URL}/api/relation/id/${SAMPLE.id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation deleted')
    })

    it('the relation is gone after deletion', async () => {
        const res = await axios.get(`${URL}/api/relation/id/${SAMPLE.id}`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('relation not found')
    })

    it('cleanup second sample', async () => {
        const res = await axios.delete(`${URL}/api/relation/id/${SECOND_SAMPLE.id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('relation deleted')
    })
})
