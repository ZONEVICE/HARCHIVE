const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const directory_repository = require('./repository')

// Every request is read as data, never as an exception, so each test asserts the status code
//  itself instead of branching on a thrown error.
const ANY_STATUS = { validateStatus: () => true }

const SAMPLE = {
    name: 'pictures',
    date_scan: 1753000000,
    date_creation: 1750000000,
    date_last_modification: 1752000000
}

let created_id = ''

beforeAll(() => {
    directory_repository.deleteAll()
})

describe('POST /api/directory/', () => {
    it('returns 400 warning when the name is not a string', async () => {
        const res = await axios.post(`${URL}/api/directory/`, { ...SAMPLE, name: 123 }, ANY_STATUS)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 400 warning when a date is not a number', async () => {
        const res = await axios.post(`${URL}/api/directory/`, { ...SAMPLE, date_scan: 'yesterday' }, ANY_STATUS)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 201 on valid directory', async () => {
        const res = await axios.post(`${URL}/api/directory/`, SAMPLE, ANY_STATUS)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory created')
    })

    it('returns 201 when the dates are omitted, and stores them as null', async () => {
        const res = await axios.post(`${URL}/api/directory/`, { name: 'undated' }, ANY_STATUS)
        expect(res.status).toBe(201)

        const list = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        const undated = list.data.data.find(d => d.name === 'undated')
        expect(undated.date_scan).toBeNull()
        expect(undated.date_creation).toBeNull()
        expect(undated.date_last_modification).toBeNull()
    })
})

describe('GET /api/directory/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)

        created_id = res.data.data.find(d => d.name === SAMPLE.name).id
        expect(typeof created_id).toBe('number')
    })
})

describe('GET /api/directory/id/:id', () => {
    it('returns 200 with the directory when found', async () => {
        const res = await axios.get(`${URL}/api/directory/id/${created_id}`, ANY_STATUS)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
        expect(res.data.data.name).toBe(SAMPLE.name)
        expect(res.data.data.date_scan).toBe(SAMPLE.date_scan)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/directory/id/nonexistent`, ANY_STATUS)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('directory not found')
    })
})

describe('PUT /api/directory/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, { ...SAMPLE, id: created_id, name: 123 }, ANY_STATUS)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 404 when the directory does not exist', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, { ...SAMPLE, id: 999999 }, ANY_STATUS)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('directory not found')
    })

    it('returns 200 on valid update', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, { ...SAMPLE, id: created_id, name: 'pictures-renamed' }, ANY_STATUS)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory updated')

        const updated = await axios.get(`${URL}/api/directory/id/${created_id}`, ANY_STATUS)
        expect(updated.data.data.name).toBe('pictures-renamed')
    })
})

describe('PUT /api/directory/update/ deleted_at', () => {
    const DELETED_SAMPLE = {
        name: 'trash-directory',
        date_scan: 1753000001,
        date_creation: 1750000001,
        date_last_modification: 1752000001
    }

    let target_id = ''

    // Builds the full update body the endpoint expects, adding the deleted_at field only
    // when the test explicitly passes one.
    const buildBody = (deleted_at) => {
        const body = { ...DELETED_SAMPLE, id: target_id }
        if (deleted_at !== undefined) body.deleted_at = deleted_at
        return body
    }

    const readDirectory = async () => {
        const res = await axios.get(`${URL}/api/directory/id/${target_id}`, ANY_STATUS)
        return res.data.data
    }

    beforeAll(async () => {
        await axios.post(`${URL}/api/directory/`, DELETED_SAMPLE, ANY_STATUS)
        const list = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        target_id = list.data.data.find(d => d.name === DELETED_SAMPLE.name).id
    })

    it('stores null on a newly created directory', async () => {
        const directory = await readDirectory()
        expect(directory.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody(true), ANY_STATUS)
        expect(res.status).toBe(200)

        const directory = await readDirectory()
        expect(typeof directory.deleted_at).toBe('number')
        expect(directory.deleted_at).toBeGreaterThanOrEqual(before)
        expect(directory.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted directories in the full listing', async () => {
        const res = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        const directory = res.data.data.find(d => d.id === target_id)
        expect(directory).toBeDefined()
        expect(typeof directory.deleted_at).toBe('number')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readDirectory()
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody(undefined), ANY_STATUS)
        expect(res.status).toBe(200)

        const after = await readDirectory()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody(false), ANY_STATUS)
        expect(res.status).toBe(200)

        const directory = await readDirectory()
        expect(directory.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody('yes'), ANY_STATUS)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })
})

describe('DELETE /api/directory/id/:id (soft-delete)', () => {
    it('stamps deleted_at and keeps the directory readable', async () => {
        // Delete a throwaway directory so the SAMPLE one stays in the database after the tests.
        await axios.post(`${URL}/api/directory/`, { name: 'throwaway-directory' }, ANY_STATUS)

        const list = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        const throwaway_id = list.data.data.find(d => d.name === 'throwaway-directory').id

        const res = await axios.delete(`${URL}/api/directory/id/${throwaway_id}`, ANY_STATUS)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory deleted')

        // Soft-deleted: the row stays readable so the client can show it in a trash can.
        const gone = await axios.get(`${URL}/api/directory/id/${throwaway_id}`, ANY_STATUS)
        expect(gone.status).toBe(200)
        expect(typeof gone.data.data.deleted_at).toBe('number')

        const after = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        expect(after.data.data.find(d => d.id === throwaway_id)).toBeDefined()
    })

    it('restores the deleted directory through the update endpoint', async () => {
        const list = await axios.get(`${URL}/api/directory/`, ANY_STATUS)
        const throwaway = list.data.data.find(d => d.name === 'throwaway-directory')

        const res = await axios.put(`${URL}/api/directory/update/`, {
            id: throwaway.id,
            name: throwaway.name,
            date_scan: throwaway.date_scan,
            date_creation: throwaway.date_creation,
            date_last_modification: throwaway.date_last_modification,
            deleted_at: false
        }, ANY_STATUS)
        expect(res.status).toBe(200)

        const restored = await axios.get(`${URL}/api/directory/id/${throwaway.id}`, ANY_STATUS)
        expect(restored.data.data.deleted_at).toBeNull()
    })
})
