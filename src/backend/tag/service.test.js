// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const tag_service = require('./service')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// The names this suite creates.
const DELETED_NAME = `service-deleted-${RUN}`
const PURGED_NAME = `service-purged-${RUN}`

// =====================================================================================
// STATE.
// =====================================================================================

// Id of the tag the suite deletes and brings back. Known once beforeAll has created it.
let deleted_id = null

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// A tag that starts every test below deleted.
beforeAll(() => {
    const created = tag_service.create(tag_service.buildForCreate({ name: DELETED_NAME }))
    deleted_id = created.id
    tag_service.softDelete(deleted_id)
})

// Purges the tag whatever state the tests left it in. The other one purges itself.
afterAll(() => {
    tag_service.hardDelete(deleted_id)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('getDeletedById', () => {
    it('finds the deleted tag that the ordinary read cannot see', () => {
        expect(tag_service.getById(deleted_id)).toBeNull()
        expect(tag_service.getDeletedById(deleted_id).name).toBe(DELETED_NAME)
    })

    it('answers null for a tag that is not deleted', () => {
        expect(tag_service.getDeletedById(999999999)).toBeNull()
    })
})

describe('getDeletedByName', () => {
    it('finds it by name, in any case', () => {
        expect(tag_service.getDeletedByName(DELETED_NAME.toUpperCase()).id).toBe(deleted_id)
    })
})

describe('getDeletedAll', () => {
    it('lists the deleted tag and no live one', () => {
        const rows = tag_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted_id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })
})

describe('restoreSoftDelete', () => {
    it('brings the same row back to life', () => {
        const restored = tag_service.restoreSoftDelete(deleted_id)
        expect(restored.id).toBe(deleted_id)
        expect(restored.name).toBe(DELETED_NAME)
        expect(restored.deleted_at).toBeNull()
        expect(tag_service.getById(deleted_id)).not.toBeNull()
    })

    it('answers null on a tag that is live', () => {
        expect(tag_service.restoreSoftDelete(deleted_id)).toBeNull()
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDelete', () => {
    it('removes the row from both families', () => {
        const created = tag_service.create(tag_service.buildForCreate({ name: PURGED_NAME }))

        tag_service.hardDelete(created.id)

        expect(tag_service.getById(created.id)).toBeNull()
        expect(tag_service.getDeletedById(created.id)).toBeNull()
    })
})
