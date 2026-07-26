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

    it('returns 409 warning on duplicate name', async () => {
        const res = await axios.post(`${URL}/api/metadata/`, { name: SAMPLE.name, value: 'another value' }, { validateStatus: () => true })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata already exists')
    })

    it('treats names as case-sensitive (the column has no COLLATE NOCASE)', async () => {
        const res = await axios.post(`${URL}/api/metadata/`, { name: SAMPLE.name.toUpperCase(), value: 'upper case' }, { validateStatus: () => true })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
    })
})

describe('GET /api/metadata/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/metadata/`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        created_id = res.data.data[0].id
        expect(typeof created_id).toBe('number')
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

    it('returns 409 warning when renaming onto a name another record already holds', async () => {
        await axios.post(`${URL}/api/metadata/`, { name: 'other_key', value: 'other' }, { validateStatus: () => true })

        const res = await axios.put(`${URL}/api/metadata/update/`, { id: created_id, name: 'other_key', value: 'HARCHIVE Updated' }, { validateStatus: () => true })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata already exists')
    })

    it('lets a record keep its own name on update', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, { id: created_id, name: SAMPLE.name, value: 'HARCHIVE Updated Again' }, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')

        const get = await axios.get(`${URL}/api/metadata/id/${created_id}`, { validateStatus: () => true })
        expect(get.data.data.value).toBe('HARCHIVE Updated Again')
    })
})

describe('PUT /api/metadata/update/ deleted_at', () => {
    const DELETED_SAMPLE = { name: 'trash_key', value: 'trash_value' }

    let target_id = ''

    // Builds the full update body the endpoint expects, adding the deleted_at field only
    //  when the test explicitly passes one.
    const buildBody = (deleted_at) => {
        const body = { ...DELETED_SAMPLE, id: target_id }
        if (deleted_at !== undefined) body.deleted_at = deleted_at
        return body
    }

    const readMetadata = async () => {
        const res = await axios.get(`${URL}/api/metadata/id/${target_id}`, { validateStatus: () => true })
        return res.data.data
    }

    beforeAll(async () => {
        await axios.post(`${URL}/api/metadata/`, DELETED_SAMPLE, { validateStatus: () => true })
        const res = await axios.get(`${URL}/api/metadata/name/${DELETED_SAMPLE.name}`, { validateStatus: () => true })
        target_id = res.data.data.id
    })

    it('stores null on newly created metadata', async () => {
        const metadata = await readMetadata()
        expect(metadata.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await axios.put(`${URL}/api/metadata/update/`, buildBody(true), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const metadata = await readMetadata()
        expect(typeof metadata.deleted_at).toBe('number')
        expect(metadata.deleted_at).toBeGreaterThanOrEqual(before)
        expect(metadata.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted metadata in the full listing', async () => {
        const res = await axios.get(`${URL}/api/metadata/`, { validateStatus: () => true })
        const metadata = res.data.data.find(m => m.id === target_id)
        expect(metadata).toBeDefined()
        expect(typeof metadata.deleted_at).toBe('number')
    })

    it('returns deleted metadata when asked by id', async () => {
        const res = await axios.get(`${URL}/api/metadata/id/${target_id}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(typeof res.data.data.deleted_at).toBe('number')
    })

    it('returns deleted metadata when asked by name', async () => {
        const res = await axios.get(`${URL}/api/metadata/name/${DELETED_SAMPLE.name}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(typeof res.data.data.deleted_at).toBe('number')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readMetadata()
        const res = await axios.put(`${URL}/api/metadata/update/`, buildBody(undefined), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const after = await readMetadata()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('sets a newer Unix Epoch when true is sent on already deleted metadata', async () => {
        const before = await readMetadata()
        expect(typeof before.deleted_at).toBe('number')

        // getSystemTime() works in whole seconds, so the clock must advance for the new
        //  value to be distinguishable from the previous one.
        await new Promise(resolve => setTimeout(resolve, 1100))

        const res = await axios.put(`${URL}/api/metadata/update/`, buildBody(true), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const after = await readMetadata()
        expect(after.deleted_at).toBeGreaterThan(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, buildBody(false), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const metadata = await readMetadata()
        expect(metadata.deleted_at).toBeNull()
    })

    it('stays null when false is sent on metadata that was not deleted', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, buildBody(false), { validateStatus: () => true })
        expect(res.status).toBe(200)

        const metadata = await readMetadata()
        expect(metadata.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await axios.put(`${URL}/api/metadata/update/`, buildBody('yes'), { validateStatus: () => true })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata invalid')
    })
})

describe('DELETE /api/metadata/name/:name (soft-delete)', () => {
    const THROWAWAY = { name: 'throwaway_name', value: 'temp' }

    it('stamps deleted_at and keeps the metadata readable', async () => {
        // Delete a throwaway record so SAMPLE stays in the database after the tests.
        await axios.post(`${URL}/api/metadata/`, THROWAWAY, { validateStatus: () => true })

        const res = await axios.delete(`${URL}/api/metadata/name/${THROWAWAY.name}`, { validateStatus: () => true })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('metadata deleted')

        // Soft-deleted: the row stays readable so the client can show it in a trash can.
        const gone = await axios.get(`${URL}/api/metadata/name/${THROWAWAY.name}`, { validateStatus: () => true })
        expect(gone.status).toBe(200)
        expect(typeof gone.data.data.deleted_at).toBe('number')

        const list = await axios.get(`${URL}/api/metadata/`, { validateStatus: () => true })
        expect(list.data.data.find(m => m.name === THROWAWAY.name)).toBeDefined()
    })

    it('returns 409 warning when re-creating a name that sits in the trash can', async () => {
        // The soft-deleted row still holds the name, so this must be a controlled 409 and
        //  never a UNIQUE constraint surfacing as a 500.
        const res = await axios.post(`${URL}/api/metadata/`, THROWAWAY, { validateStatus: () => true })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('metadata already exists')
    })

    it('restores the deleted metadata through the update endpoint', async () => {
        const current = await axios.get(`${URL}/api/metadata/name/${THROWAWAY.name}`, { validateStatus: () => true })
        const target_id = current.data.data.id

        const res = await axios.put(`${URL}/api/metadata/update/`, { id: target_id, name: THROWAWAY.name, value: THROWAWAY.value, deleted_at: false }, { validateStatus: () => true })
        expect(res.status).toBe(200)

        const restored = await axios.get(`${URL}/api/metadata/id/${target_id}`, { validateStatus: () => true })
        expect(restored.data.data.deleted_at).toBeNull()
    })
})
