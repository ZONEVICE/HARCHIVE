const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const file_repository = require('./repository')

const SAMPLE = {
    name: 'photo.jpg',
    hash_256_sha: 'abc123def456',
    relative_path: '/pictures/photo.jpg',
    extension: 'jpg'
}

let created_id = ''

beforeAll(() => {
    file_repository.deleteAll()
})

describe('POST /api/file/', () => {
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
        const res = await axios.put(`${URL}/api/file/update/`, { ...SAMPLE, id: created_id, name: 123 }, { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })

    it('returns 200 on valid update', async () => {
        const res = await axios.put(`${URL}/api/file/update/`, { ...SAMPLE, id: created_id, name: 'updated.jpg' }, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file updated')
    })
})

describe('PUT /api/file/update/ deleted_at', () => {
    const DELETED_SAMPLE = {
        name: 'trash.png',
        hash_256_sha: 'deleted-at-hash',
        relative_path: '/pictures/trash.png',
        extension: 'png'
    }

    let target_id = ''

    // Builds the full update body the endpoint expects, adding the deleted_at field only
    // when the test explicitly passes one.
    const buildBody = (deleted_at) => {
        const body = { ...DELETED_SAMPLE, id: target_id }
        if (deleted_at !== undefined) body.deleted_at = deleted_at
        return body
    }

    const readFile = async () => {
        const res = await axios.get(`${URL}/api/file/id/${target_id}`, { validateStatus: () => true })
        return res.data.data
    }

    beforeAll(async () => {
        await axios.post(`${URL}/api/file/`, DELETED_SAMPLE, { validateStatus: () => true })
        const list = await axios.get(`${URL}/api/file/`, { validateStatus: () => true })
        target_id = list.data.data.find(f => f.hash_256_sha === DELETED_SAMPLE.hash_256_sha).id
    })

    it('stores null on a newly created file', async () => {
        const file = await readFile()
        expect(file.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await axios.put(`${URL}/api/file/update/`, buildBody(true), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const file = await readFile()
        expect(typeof file.deleted_at).toBe('number')
        expect(file.deleted_at).toBeGreaterThanOrEqual(before)
        expect(file.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted files in the full listing', async () => {
        const res = await axios.get(`${URL}/api/file/`, { validateStatus: () => true })
        const file = res.data.data.find(f => f.id === target_id)
        expect(file).toBeDefined()
        expect(typeof file.deleted_at).toBe('number')
    })

    it('returns a deleted file when asked by id', async () => {
        const res = await axios.get(`${URL}/api/file/id/${target_id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(typeof res.data.data.deleted_at).toBe('number')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readFile()
        const res = await axios.put(`${URL}/api/file/update/`, buildBody(undefined), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const after = await readFile()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('sets a newer Unix Epoch when true is sent on an already deleted file', async () => {
        const before = await readFile()
        expect(typeof before.deleted_at).toBe('number')

        // getSystemTime() works in whole seconds, so the clock must advance for the new
        // value to be distinguishable from the previous one.
        await new Promise(resolve => setTimeout(resolve, 1100))

        const res = await axios.put(`${URL}/api/file/update/`, buildBody(true), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const after = await readFile()
        expect(after.deleted_at).toBeGreaterThan(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await axios.put(`${URL}/api/file/update/`, buildBody(false), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const file = await readFile()
        expect(file.deleted_at).toBeNull()
    })

    it('stays null when false is sent on a file that was not deleted', async () => {
        const res = await axios.put(`${URL}/api/file/update/`, buildBody(false), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const file = await readFile()
        expect(file.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await axios.put(`${URL}/api/file/update/`, buildBody('yes'), { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('file invalid')
    })
})

describe('DELETE /api/file/id/:id', () => {
    it('returns 200 on delete', async () => {
        // Delete a throwaway file so the SAMPLE file stays in the database after the tests.
        const throwaway = { name: 'throwaway.tmp', hash_256_sha: 'throwaway-hash', relative_path: '/tmp/throwaway.tmp', extension: 'tmp' }
        await axios.post(`${URL}/api/file/`, throwaway, { validateStatus: () => true })

        const list = await axios.get(`${URL}/api/file/`, { validateStatus: () => true })
        const throwaway_id = list.data.data.find(f => f.hash_256_sha === 'throwaway-hash').id

        const res = await axios.delete(`${URL}/api/file/id/${throwaway_id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('file deleted')
    })
})
