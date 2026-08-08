const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

const axios = require('axios')

const tag_repository = require('./repository')
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')

const SAMPLE = { name: 'portrait', metadata: '{"color":"blue"}' }

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

let created_id = ''

// --------------------------------------------------------------------------------
// One wrapper per route in routes.js.
//
// Only the tag entity is exercised here. The association of a tag with the rest of
// the system lives in the relation entity, so those tests live in
// relation/relation.test.js.
// --------------------------------------------------------------------------------
const tagGetAll = () => axios.get(`${URL}/api/tag/`, AS_ADMIN)
const tagGetById = (id) => axios.get(`${URL}/api/tag/id/${id}`, AS_ADMIN)
const tagGetByName = (name) => axios.get(`${URL}/api/tag/name/${encodeURIComponent(name)}`, AS_ADMIN)
const tagPost = (body) => axios.post(`${URL}/api/tag/`, body, AS_ADMIN)
const tagUpdate = (body) => axios.put(`${URL}/api/tag/update/`, body, AS_ADMIN)
const tagDelete = (id) => axios.delete(`${URL}/api/tag/id/${id}`, AS_ADMIN)

beforeAll(async () => {
    await loginAsAdmin()
    tag_repository.deleteAll()
})

describe('POST /api/tag/', () => {
    it('returns 400 warning when name is not a string', async () => {
        const res = await tagPost({ name: 123 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when metadata is not a string', async () => {
        const res = await tagPost({ name: 'landscape', metadata: { color: 'red' } })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when the body is empty', async () => {
        const res = await tagPost({})
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when the name is missing but metadata is sent', async () => {
        const res = await tagPost({ metadata: '{}' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 201 on valid tag', async () => {
        const res = await tagPost(SAMPLE)
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag created')
    })

    it('returns 201 with default metadata when metadata is omitted', async () => {
        const res = await tagPost({ name: 'sketch' })
        expect(res.status).toBe(201)
        expect(res.data.status).toBe('success')
    })

    it('stores the model default metadata when the client omits it', async () => {
        const res = await tagGetByName('sketch')
        expect(res.status).toBe(200)
        expect(res.data.data.metadata).toBe('{}')
    })

    it('stores deleted_at as null on a freshly created tag', async () => {
        const res = await tagGetByName('sketch')
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 409 warning on the exact same name', async () => {
        const res = await tagPost({ name: SAMPLE.name })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('returns 409 warning on duplicate name (case-insensitive)', async () => {
        const res = await tagPost({ name: 'PORTRAIT' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('accepts a name with spaces and accents', async () => {
        const res = await tagPost({ name: 'ilustración digital' })
        expect(res.status).toBe(201)

        const created = await tagGetByName('ilustración digital')
        expect(created.status).toBe(200)
        expect(created.data.data.name).toBe('ilustración digital')
    })
})

describe('GET /api/tag/', () => {
    it('returns 200 with a data array', async () => {
        const res = await tagGetAll()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(Array.isArray(res.data.data)).toBe(true)
        created_id = res.data.data.find(t => t.name === 'portrait').id
        expect(typeof created_id).toBe('number')
    })

    it('returns the entity described by the tag table and nothing else', async () => {
        // Guard on the shape of the row: this fails the moment a column is added, removed or
        //  renamed in the tag schema, which is the reminder to update the rest of the entity.
        const res = await tagGetByName(SAMPLE.name)
        expect(Object.keys(res.data.data).sort()).toEqual(['deleted_at', 'id', 'metadata', 'name'])
    })

    it('returns the documented types on every listed tag', async () => {
        const res = await tagGetAll()
        const tag = res.data.data.find(t => t.id === created_id)
        expect(typeof tag.id).toBe('number')
        expect(typeof tag.name).toBe('string')
        expect(typeof tag.metadata).toBe('string')
        expect(tag.deleted_at === null || typeof tag.deleted_at === 'number').toBe(true)
    })
})

describe('GET /api/tag/id/:id', () => {
    it('returns 200 with the tag when found', async () => {
        const res = await tagGetById(created_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.id).toBe(created_id)
        expect(res.data.data.deleted_at).toBeNull()
    })

    it('returns 400 when the id is not a number', async () => {
        const res = await tagGetById('nonexistent')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 404 on a numeric id that no tag holds', async () => {
        const res = await tagGetById(999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })
})

describe('GET /api/tag/name/:name', () => {
    it('returns 200 with the tag when found (case-insensitive)', async () => {
        const res = await tagGetByName('PORTRAIT')
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.data.name).toBe('portrait')
    })

    it('resolves the same tag whatever the case of the request', async () => {
        const res = await tagGetByName('PoRtRaIt')
        expect(res.status).toBe(200)
        expect(res.data.data.id).toBe(created_id)
    })

    it('returns 404 when the name does not exist', async () => {
        const res = await tagGetByName('nonexistent_name')
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })
})

describe('PUT /api/tag/update/', () => {
    it('returns 400 warning on invalid body (metadata not a string)', async () => {
        const res = await tagUpdate({ id: created_id, name: 'portrait', metadata: 5 })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when the id is a string', async () => {
        // Ids are INTEGER, and validateUpdate checks them with isNumber.
        const res = await tagUpdate({ id: String(created_id), name: 'portrait', metadata: '{}' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when the name is missing', async () => {
        const res = await tagUpdate({ id: created_id, metadata: '{}' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when metadata is missing', async () => {
        // Unlike validatePost, validateUpdate demands the full row: metadata is mandatory here.
        const res = await tagUpdate({ id: created_id, name: 'portrait' })
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 404 when the tag does not exist', async () => {
        const res = await tagUpdate({ id: 999999, name: 'ghost', metadata: '{}' })
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })

    it('returns 200 on valid update', async () => {
        const res = await tagUpdate({ id: created_id, name: 'portrait', metadata: '{"color":"green"}' })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag updated')

        const get = await tagGetById(created_id)
        expect(get.data.data.metadata).toBe('{"color":"green"}')
    })

    it('keeps the id untouched across an update', async () => {
        const res = await tagUpdate({ id: created_id, name: 'portrait', metadata: '{"color":"green"}' })
        expect(res.status).toBe(200)

        const get = await tagGetById(created_id)
        expect(get.data.data.id).toBe(created_id)
    })
})

describe('PUT /api/tag/update/ unique name', () => {
    const CLASH_A = { name: 'clash-a', metadata: '{}' }
    const CLASH_B = { name: 'clash-b', metadata: '{}' }

    let clash_a_id = ''

    beforeAll(async () => {
        await tagPost(CLASH_A)
        await tagPost(CLASH_B)
        const res = await tagGetByName(CLASH_A.name)
        clash_a_id = res.data.data.id
    })

    it('returns 409 warning when renaming onto a name another tag holds', async () => {
        const res = await tagUpdate({ id: clash_a_id, name: CLASH_B.name, metadata: '{}' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('returns 409 warning when the clash only differs in case', async () => {
        const res = await tagUpdate({ id: clash_a_id, name: CLASH_B.name.toUpperCase(), metadata: '{}' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('lets a tag keep its own name', async () => {
        const res = await tagUpdate({ id: clash_a_id, name: CLASH_A.name, metadata: '{"kept":true}' })
        expect(res.status).toBe(200)

        const get = await tagGetById(clash_a_id)
        expect(get.data.data.metadata).toBe('{"kept":true}')
    })

    it('lets a tag re-case its own name', async () => {
        // The clash is the tag itself, so isNameTakenByAnother lets it through.
        const res = await tagUpdate({ id: clash_a_id, name: CLASH_A.name.toUpperCase(), metadata: '{}' })
        expect(res.status).toBe(200)

        const get = await tagGetById(clash_a_id)
        expect(get.data.data.name).toBe(CLASH_A.name.toUpperCase())
    })
})

describe('DELETE /api/tag/id/:id (soft-delete)', () => {
    it('stamps deleted_at and keeps the tag readable', async () => {
        // Create a throwaway tag so the sample tags stay in the database after the tests.
        await tagPost({ name: 'temp-tag' })
        const created = await tagGetByName('temp-tag')
        const temp_id = created.data.data.id

        const res = await tagDelete(temp_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('tag deleted')

        // Soft-deleted: the row stays readable so the client can show it in a trash can.
        const gone = await tagGetById(temp_id)
        expect(gone.status).toBe(200)
        expect(typeof gone.data.data.deleted_at).toBe('number')

        const list = await tagGetAll()
        expect(list.data.data.find(t => t.id === temp_id)).toBeDefined()
    })

    it('keeps the name of a deleted tag taken, answering 409 instead of a 500', async () => {
        // The soft-deleted row still holds its UNIQUE name: re-creating it must be a controlled
        //  409 and never the UNIQUE constraint surfacing as a 500.
        const res = await tagPost({ name: 'temp-tag' })
        expect(res.status).toBe(409)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag already exists')
    })

    it('restores the deleted tag through the update endpoint', async () => {
        const current = await tagGetByName('temp-tag')
        const temp_id = current.data.data.id

        const res = await tagUpdate({ id: temp_id, name: 'temp-tag', metadata: '{}', deleted_at: false })
        expect(res.status).toBe(200)

        const restored = await tagGetById(temp_id)
        expect(restored.data.data.deleted_at).toBeNull()
    })

    it('answers 404 when the id does not exist', async () => {
        const res = await tagDelete(999999)
        expect(res.status).toBe(404)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag not found')
    })

    it('answers 400 when the id is not a number', async () => {
        const res = await tagDelete('not-an-id')
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })
})

describe('PUT /api/tag/update/ deleted_at', () => {
    const DELETED_SAMPLE = { name: 'trash-tag', metadata: '{}' }

    let target_id = ''

    // Builds the full update body the endpoint expects, adding the deleted_at field only
    //  when the test explicitly passes one.
    const buildBody = (deleted_at) => {
        const body = { ...DELETED_SAMPLE, id: target_id }
        if (deleted_at !== undefined) body.deleted_at = deleted_at
        return body
    }

    const readTag = async () => {
        const res = await tagGetById(target_id)
        return res.data.data
    }

    beforeAll(async () => {
        await tagPost(DELETED_SAMPLE)
        const res = await tagGetByName(DELETED_SAMPLE.name)
        target_id = res.data.data.id
    })

    it('stores null on a newly created tag', async () => {
        const tag = await readTag()
        expect(tag.deleted_at).toBeNull()
    })

    it('stores the Unix Epoch in seconds when true is sent', async () => {
        const before = Math.floor(Date.now() / 1000)
        const res = await tagUpdate(buildBody(true))
        expect(res.status).toBe(200)

        const tag = await readTag()
        expect(typeof tag.deleted_at).toBe('number')
        expect(tag.deleted_at).toBeGreaterThanOrEqual(before)
        expect(tag.deleted_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    })

    it('returns deleted tags in the full listing', async () => {
        const res = await tagGetAll()
        const tag = res.data.data.find(t => t.id === target_id)
        expect(tag).toBeDefined()
        expect(typeof tag.deleted_at).toBe('number')
    })

    it('returns a deleted tag when asked by id', async () => {
        const res = await tagGetById(target_id)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(typeof res.data.data.deleted_at).toBe('number')
    })

    it('returns a deleted tag when asked by name', async () => {
        const res = await tagGetByName(DELETED_SAMPLE.name)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(typeof res.data.data.deleted_at).toBe('number')
    })

    it('keeps the stored value when deleted_at is not sent', async () => {
        const before = await readTag()
        const res = await tagUpdate(buildBody(undefined))
        expect(res.status).toBe(200)

        const after = await readTag()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('keeps the stored value when deleted_at is null', async () => {
        const before = await readTag()
        const res = await tagUpdate(buildBody(null))
        expect(res.status).toBe(200)

        const after = await readTag()
        expect(after.deleted_at).toBe(before.deleted_at)
    })

    it('sets a newer Unix Epoch when true is sent on an already deleted tag', async () => {
        const before = await readTag()
        expect(typeof before.deleted_at).toBe('number')

        // getSystemTime() works in whole seconds, so the clock must advance for the new
        //  value to be distinguishable from the previous one.
        await new Promise(resolve => setTimeout(resolve, 1100))

        const res = await tagUpdate(buildBody(true))
        expect(res.status).toBe(200)

        const after = await readTag()
        expect(after.deleted_at).toBeGreaterThan(before.deleted_at)
    })

    it('clears the value back to null when false is sent', async () => {
        const res = await tagUpdate(buildBody(false))
        expect(res.status).toBe(200)

        const tag = await readTag()
        expect(tag.deleted_at).toBeNull()
    })

    it('stays null when false is sent on a tag that was not deleted', async () => {
        const res = await tagUpdate(buildBody(false))
        expect(res.status).toBe(200)

        const tag = await readTag()
        expect(tag.deleted_at).toBeNull()
    })

    it('returns 400 warning when deleted_at is not a boolean', async () => {
        const res = await tagUpdate(buildBody('yes'))
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('returns 400 warning when deleted_at is a timestamp', async () => {
        // The endpoint takes a flag, never a timestamp: the value is produced by the service.
        const res = await tagUpdate(buildBody(1750000000))
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('tag invalid')
    })

    it('restores a soft-deleted tag through the update endpoint', async () => {
        await tagUpdate(buildBody(true))
        expect(typeof (await readTag()).deleted_at).toBe('number')

        const res = await tagUpdate(buildBody(false))
        expect(res.status).toBe(200)
        expect((await readTag()).deleted_at).toBeNull()
    })
})

describe('the authenticate middleware guards every route', () => {
    // The guard answers before the handler runs, so the body is never even looked at: a
    //  perfectly valid request without a session is rejected exactly like an invalid one.
    it('answers 401 on a read without a session', async () => {
        const res = await axios.get(`${URL}/api/tag/`, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 on a write without a session', async () => {
        const res = await axios.post(`${URL}/api/tag/`, { name: `unauthenticated-${Date.now()}` }, ANONYMOUS)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('authentication required')
    })
})
