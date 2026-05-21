const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const file_repository = require('./repository')

const SAMPLE = {
    name: 'photo.jpg',
    hash_256_sha: 'abc123def456',
    relative_path: '/pictures/photo.jpg',
    extension: 'jpg',
    tags: []
}

let created_id = ''

beforeAll(() => {
    file_repository.deleteAll()
})

describe('POST /api/file/', () => {
    it('returns 400 warning when tags contains non-strings', async () => {
        const res = await axios.post(`${URL}/api/file/`, { ...SAMPLE, tags: [1, 2] }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })

    it('returns 400 warning when a required string field is missing', async () => {
        const res = await axios.post(`${URL}/api/file/`, { ...SAMPLE, name: 123 }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })

    it('returns 201 on valid file', async () => {
        const res = await axios.post(`${URL}/api/file/`, SAMPLE, { validateStatus: () => true })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file created')
    })
})

describe('GET /api/file/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/file/`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        created_id = res.data.data[0].id
    })
})

describe('GET /api/file/id/:id', () => {
    it('returns 200 with the file when found', async () => {
        const res = await axios.get(`${URL}/api/file/id/${created_id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/file/id/nonexistent`, { validateStatus: () => true })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('file not found')
    })
})

describe('PUT /api/file/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.put(`${URL}/api/file/update/`, { ...SAMPLE, id: created_id, tags: ['valid', 123] }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })

    it('returns 200 on valid update', async () => {
        const res = await axios.put(`${URL}/api/file/update/`, { ...SAMPLE, id: created_id, name: 'updated.jpg', tags: ['tag-id-1'] }, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file updated')
    })
})

describe('DELETE /api/file/id/:id', () => {
    it('returns 200 on delete', async () => {
        const res = await axios.delete(`${URL}/api/file/id/${created_id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file deleted')
    })
})
