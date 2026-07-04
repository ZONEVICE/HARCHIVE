const { PORT } = require('../core/env');
const URL = `http://localhost:${PORT}`;

const axios = require('axios');

const metadata_model = require('./model');
const metadata_repository = require('./repository');

const SAMPLE = { name: 'site_name', value: 'HARCHIVE' }

let created_id = ''

beforeAll(() => {
    metadata_repository.deleteAll()
});

describe('POST /api/metadata/', () => {
    it('returns 400 warning on invalid body (value not a string)', async () => {
        const res = await axios.post(`${URL}/api/metadata/`, { name: 'site_name', value: 123 }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata invalid')
    })

    it('returns 201 on valid metadata', async () => {
        const res = await axios.post(`${URL}/api/metadata/`, SAMPLE, { validateStatus: () => true })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata created')
    })
})

describe('GET /api/metadata/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/metadata/`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        created_id = res.data.data[0].id
        expect(typeof created_id).toBe('string')
    })
})

describe('GET /api/metadata/id/:id', () => {
    it('returns 200 with the metadata when found', async () => {
        const res = await axios.get(`${URL}/api/metadata/id/${created_id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/metadata/id/nonexistent`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('metadata not found')
    })
})

describe('GET /api/metadata/name/:name', () => {
    it('returns 200 with the metadata when found', async () => {
        const res = await axios.get(`${URL}/api/metadata/name/${SAMPLE.name}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.name).toBe(SAMPLE.name)
    })

    it('returns 404 when the name does not exist', async () => {
        const res = await axios.get(`${URL}/api/metadata/name/nonexistent_name`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('metadata not found')
    })
})

describe('PUT /api/metadata/update/', () => {
    it('returns 400 warning on invalid body (value not a string)', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, { id: created_id, name: 'site_name', value: 123 }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata invalid')
    })

    it('returns 200 on valid update', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, { id: created_id, name: SAMPLE.name, value: 'HARCHIVE Updated' }, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata updated')
    })
})

describe('DELETE /api/metadata/name/:name', () => {
    it('returns 200 on delete', async () => {
        // Delete a throwaway record so SAMPLE stays in the database after the tests.
        const throwaway = { name: 'throwaway_name', value: 'temp' }
        await axios.post(`${URL}/api/metadata/`, throwaway, { validateStatus: () => true })

        const res = await axios.delete(`${URL}/api/metadata/name/${throwaway.name}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata deleted')
    })
})
