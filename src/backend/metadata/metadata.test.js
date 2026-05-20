const { PORT } = require('../core/env');
const URL = `http://localhost:${PORT}`;

const axios = require('axios');

const metadata_model = require('./model');
const metadata_repository = require('./repository');

const SAMPLE = { id: 1, key: 'site_name', value: 'HARCHIVE' }

beforeAll(() => {
    metadata_repository.deleteAll()
});

describe('POST /api/metadata/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.post(`${URL}/api/metadata/`, { id: '1', key: 'site_name', value: 'HARCHIVE' }, { validateStatus: () => true })
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
    })
})

describe('GET /api/metadata/id/:id', () => {
    it('returns 200 with the metadata when found', async () => {
        const res = await axios.get(`${URL}/api/metadata/id/${SAMPLE.id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(SAMPLE.id)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/metadata/id/nonexistent`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('metadata not found')
    })
})

describe('GET /api/metadata/key/:key', () => {
    it('returns 200 with the metadata when found', async () => {
        const res = await axios.get(`${URL}/api/metadata/key/${SAMPLE.key}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.key).toBe(SAMPLE.key)
    })

    it('returns 404 when the key does not exist', async () => {
        const res = await axios.get(`${URL}/api/metadata/key/nonexistent_key`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('metadata not found')
    })
})

describe('PUT /api/metadata/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, { id: '1', key: 'site_name', value: 'HARCHIVE' }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata invalid')
    })

    it('returns 200 on valid update', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, { ...SAMPLE, value: 'HARCHIVE Updated' }, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata updated')
    })
})

describe('DELETE /api/metadata/key/:key', () => {
    it('returns 200 on delete', async () => {
        const res = await axios.delete(`${URL}/api/metadata/key/${SAMPLE.key}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata deleted')
    })
})
