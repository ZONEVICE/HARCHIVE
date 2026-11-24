// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const directory_service = require('./service')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// The directory this suite deletes and brings back.
const SAMPLE = { name: `Holidays service-${RUN}`, date_scan: 1700000000, date_creation: 1600000000, date_last_modification: 1650000000 }

// =====================================================================================
// STATE.
// =====================================================================================

// Id of the directory the suite deletes and brings back. Known once beforeAll has created it.
let deleted_id = null

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// A directory that starts every test below deleted.
beforeAll(() => {
    const created = directory_service.create(directory_service.buildForCreate(SAMPLE))
    deleted_id = created.id
    directory_service.softDelete(deleted_id)
})

// Purges the directory whatever state the tests left it in. The other one purges itself.
afterAll(() => {
    directory_service.hardDelete(deleted_id)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('getDeletedById', () => {
    it('finds the deleted directory that the ordinary read cannot see', () => {
        expect(directory_service.getById(deleted_id)).toBeNull()
        expect(directory_service.getDeletedById(deleted_id).name).toBe(SAMPLE.name)
    })

    it('answers null for an id nobody holds', () => {
        expect(directory_service.getDeletedById(999999999)).toBeNull()
    })
})

describe('getDeletedAll', () => {
    it('lists the deleted directory and no live one', () => {
        const rows = directory_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted_id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })
})

describe('restoreSoftDelete', () => {
    it('brings the same row back to life, every value untouched', () => {
        const restored = directory_service.restoreSoftDelete(deleted_id)
        expect(restored).toEqual({ ...directory_service.getById(deleted_id), deleted_at: null })
        expect(restored.id).toBe(deleted_id)
        expect(restored.name).toBe(SAMPLE.name)
    })

    it('answers null on a directory that is live', () => {
        expect(directory_service.restoreSoftDelete(deleted_id)).toBeNull()
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDelete', () => {
    it('removes the row from both families', () => {
        const created = directory_service.create(directory_service.buildForCreate({ ...SAMPLE }))

        directory_service.hardDelete(created.id)

        expect(directory_service.getById(created.id)).toBeNull()
        expect(directory_service.getDeletedById(created.id)).toBeNull()
    })
})
