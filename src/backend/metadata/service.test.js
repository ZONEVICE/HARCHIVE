// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const metadata_service = require('./service')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// The names this suite creates.
const DELETED_NAME = `service-deleted-${RUN}`
const PURGED_NAME = `service-purged-${RUN}`

// The value the deleted record is created with, and must come back with.
const VALUE = 'Kept Exactly'

// =====================================================================================
// STATE.
// =====================================================================================

// Id of the record the suite deletes and brings back. Known once beforeAll has created it.
let deleted_id = null

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// A record that starts every test below deleted.
beforeAll(() => {
    const created = metadata_service.create(metadata_service.buildForCreate({ name: DELETED_NAME, value: VALUE }))
    deleted_id = created.id
    metadata_service.softDeleteByName(DELETED_NAME)
})

// Purges the record whatever state the tests left it in. The other one purges itself.
afterAll(() => {
    metadata_service.hardDeleteByName(DELETED_NAME)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('getDeletedById', () => {
    it('finds the deleted record that the ordinary read cannot see', () => {
        expect(metadata_service.getById(deleted_id)).toBeNull()
        expect(metadata_service.getDeletedById(deleted_id).name).toBe(DELETED_NAME)
    })
})

describe('getDeletedByName', () => {
    it('finds it by name, in any case', () => {
        expect(metadata_service.getDeletedByName(DELETED_NAME.toUpperCase()).id).toBe(deleted_id)
    })
})

describe('getDeletedAll', () => {
    it('lists the deleted record and no live one', () => {
        const rows = metadata_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted_id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })
})

describe('restoreSoftDeleteByName', () => {
    it('brings the same row back to life, value untouched, in any case', () => {
        const restored = metadata_service.restoreSoftDeleteByName(DELETED_NAME.toUpperCase())
        expect(restored.id).toBe(deleted_id)
        expect(restored.value).toBe(VALUE)
        expect(restored.deleted_at).toBeNull()
        expect(metadata_service.getByName(DELETED_NAME)).not.toBeNull()
    })

    it('answers null on a record that is live', () => {
        expect(metadata_service.restoreSoftDeleteByName(DELETED_NAME)).toBeNull()
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDeleteByName', () => {
    it('removes the row from both families, in any case', () => {
        const created = metadata_service.create(metadata_service.buildForCreate({ name: PURGED_NAME, value: 'x' }))

        metadata_service.hardDeleteByName(PURGED_NAME.toUpperCase())

        expect(metadata_service.getById(created.id)).toBeNull()
        expect(metadata_service.getDeletedById(created.id)).toBeNull()
    })
})
