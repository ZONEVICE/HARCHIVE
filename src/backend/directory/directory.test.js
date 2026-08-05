const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const directory_repository = require('./repository')
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')

// The axios config every request in this file uses.
//
//  `validateStatus` reads every response as data, never as an exception, so each test asserts
//  the status code itself instead of branching on a thrown error.
//
//  `headers.Cookie` carries the session. Every route of this entity sits behind the
//  `authenticate` middleware, so the suite has to drive it as a logged-in client. The cookie is
//  only known once the server answers a login, so it is filled in by the beforeAll below and
//  every request reads it from here.
const AS_ADMIN = { validateStatus: () => true, headers: {} }

// A request with no session at all, for the tests that check the guard itself.
const ANONYMOUS = { validateStatus: () => true }

// Signs in as the seeded admin and keeps its session cookie for the rest of the file.
const loginAsAdmin = async () => {
    const res = await axios.post(`${URL}/api/user/login/`, {
        username: ADMIN_USERNAME,
        password: ADMIN_DEFAULT_PASSWORD
    })
    AS_ADMIN.headers.Cookie = res.headers['set-cookie'][0].split(';')[0]
}

const SAMPLE = {
    name: 'pictures',
    date_scan: 1753000000,
    date_creation: 1750000000,
    date_last_modification: 1752000000
}

let created_id = ''

beforeAll(async () => {
    await loginAsAdmin()
    directory_repository.deleteAll()
})

describe('POST /api/directory/', () => {
    it('returns 400 warning when the name is not a string', async () => {
        const res = await axios.post(`${URL}/api/directory/`, { ...SAMPLE, name: 123 }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 400 warning when a date is not a number', async () => {
        const res = await axios.post(`${URL}/api/directory/`, { ...SAMPLE, date_scan: 'yesterday' }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 201 on valid directory', async () => {
        const res = await axios.post(`${URL}/api/directory/`, SAMPLE, AS_ADMIN)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory created')
    })

    it('returns 201 when the dates are omitted, and stores them as null', async () => {
        const res = await axios.post(`${URL}/api/directory/`, { name: 'undated' }, AS_ADMIN)
        expect(res.status).toBe(201)

        const list = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        const undated = list.data.data.find(d => d.name === 'undated')
        expect(undated.date_scan).toBeNull()
        expect(undated.date_creation).toBeNull()
        expect(undated.date_last_modification).toBeNull()
    })
})

describe('GET /api/directory/', () => {
    it('returns 200 with a data array', async () => {
        const res = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)

        created_id = res.data.data.find(d => d.name === SAMPLE.name).id
        expect(typeof created_id).toBe('number')
    })
})

describe('GET /api/directory/id/:id', () => {
    it('returns 200 with the directory when found', async () => {
        const res = await axios.get(`${URL}/api/directory/id/${created_id}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
        expect(res.data.data.name).toBe(SAMPLE.name)
        expect(res.data.data.date_scan).toBe(SAMPLE.date_scan)
    })

    it('returns 404 when the id does not exist', async () => {
        const res = await axios.get(`${URL}/api/directory/id/nonexistent`, AS_ADMIN)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('directory not found')
    })
})

describe('PUT /api/directory/update/', () => {
    it('returns 400 warning on invalid body', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, { ...SAMPLE, id: created_id, name: 123 }, AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })

    it('returns 404 when the directory does not exist', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, { ...SAMPLE, id: 999999 }, AS_ADMIN)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('directory not found')
    })

    it('returns 200 on valid update', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, { ...SAMPLE, id: created_id, name: 'pictures-renamed' }, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory updated')

        const updated = await axios.get(`${URL}/api/directory/id/${created_id}`, AS_ADMIN)
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
        const res = await axios.get(`${URL}/api/directory/id/${target_id}`, AS_ADMIN)
        return res.data.data
    }

    beforeAll(async () => {
        await axios.post(`${URL}/api/directory/`, DELETED_SAMPLE, AS_ADMIN)
        const list = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        target_id = list.data.data.find(d => d.name === DELETED_SAMPLE.name).id
    })

    it('stores null on a newly created directory', async () => {
        const directory = await readDirectory()
        expect(directory.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody(true), AS_ADMIN)
        expect(res.status).toBe(200)

        const directory = await readDirectory()
        expect(typeof directory.deleted_at).toBe('number')
        expect(directory.deleted_at).toBeGreaterThanOrEqual(before)
        expect(directory.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted directories in the full listing', async () => {
        const res = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        const directory = res.data.data.find(d => d.id === target_id)
        expect(directory).toBeDefined()
        expect(typeof directory.deleted_at).toBe('number')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readDirectory()
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody(undefined), AS_ADMIN)
        expect(res.status).toBe(200)

        const after = await readDirectory()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody(false), AS_ADMIN)
        expect(res.status).toBe(200)

        const directory = await readDirectory()
        expect(directory.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await axios.put(`${URL}/api/directory/update/`, buildBody('yes'), AS_ADMIN)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('directory invalid')
    })
})

describe('DELETE /api/directory/id/:id (soft-delete)', () => {
    it('stamps deleted_at and keeps the directory readable', async () => {
        // Delete a throwaway directory so the SAMPLE one stays in the database after the tests.
        await axios.post(`${URL}/api/directory/`, { name: 'throwaway-directory' }, AS_ADMIN)

        const list = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        const throwaway_id = list.data.data.find(d => d.name === 'throwaway-directory').id

        const res = await axios.delete(`${URL}/api/directory/id/${throwaway_id}`, AS_ADMIN)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('directory deleted')

        // Soft-deleted: the row stays readable so the client can show it in a trash can.
        const gone = await axios.get(`${URL}/api/directory/id/${throwaway_id}`, AS_ADMIN)
        expect(gone.status).toBe(200)
        expect(typeof gone.data.data.deleted_at).toBe('number')

        const after = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        expect(after.data.data.find(d => d.id === throwaway_id)).toBeDefined()
    })

    it('restores the deleted directory through the update endpoint', async () => {
        const list = await axios.get(`${URL}/api/directory/`, AS_ADMIN)
        const throwaway = list.data.data.find(d => d.name === 'throwaway-directory')

        const res = await axios.put(`${URL}/api/directory/update/`, {
            id: throwaway.id,
            name: throwaway.name,
            date_scan: throwaway.date_scan,
            date_creation: throwaway.date_creation,
            date_last_modification: throwaway.date_last_modification,
            deleted_at: false
        }, AS_ADMIN)
        expect(res.status).toBe(200)

        const restored = await axios.get(`${URL}/api/directory/id/${throwaway.id}`, AS_ADMIN)
        expect(restored.data.data.deleted_at).toBeNull()
    })
})

describe('the authenticate middleware guards every route', () => {
    // The guard answers before the handler runs, so the body is never even looked at: a
    //  perfectly valid request without a session is rejected exactly like an invalid one.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/directory/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a write without a session', async () => {
        const res = await axios.post(`${URL}/api/directory/`, SAMPLE, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })
})
