// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const file_service = require('./service')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// The file this suite deletes and brings back.
const SAMPLE = { name: `Photo service-${RUN}.JPG`, hash_256_sha: `sha-service-${RUN}`, relative_path: `/photos/Photo service-${RUN}.JPG`, extension: 'JPG' }

// =====================================================================================
// STATE.
// =====================================================================================

// Id of the file the suite deletes and brings back. Known once beforeAll has created it.
let deleted_id = null

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// A file that starts every test below deleted.
beforeAll(() => {
    const created = file_service.create(file_service.buildForCreate(SAMPLE))
    deleted_id = created.id
    file_service.softDelete(deleted_id)
})

// Purges the file whatever state the tests left it in. The other one purges itself.
afterAll(() => {
    file_service.hardDelete(deleted_id)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('getDeletedById', () => {
    it('finds the deleted file that the ordinary read cannot see', () => {
        expect(file_service.getById(deleted_id)).toBeNull()
        expect(file_service.getDeletedById(deleted_id).name).toBe(SAMPLE.name)
    })

    it('answers null for an id nobody holds', () => {
        expect(file_service.getDeletedById(999999999)).toBeNull()
    })
})

describe('getDeletedAll', () => {
    it('lists the deleted file and no live one', () => {
        const rows = file_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted_id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })
})

describe('restoreSoftDelete', () => {
    it('brings the same row back to life, every value untouched', () => {
        const restored = file_service.restoreSoftDelete(deleted_id)
        expect(restored).toEqual({ ...file_service.getById(deleted_id), deleted_at: null })
        expect(restored.id).toBe(deleted_id)
        expect(restored.name).toBe(SAMPLE.name)
    })

    it('answers null on a file that is live', () => {
        expect(file_service.restoreSoftDelete(deleted_id)).toBeNull()
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDelete', () => {
    it('removes the row from both families', () => {
        const created = file_service.create(file_service.buildForCreate({ ...SAMPLE }))

        file_service.hardDelete(created.id)

        expect(file_service.getById(created.id)).toBeNull()
        expect(file_service.getDeletedById(created.id)).toBeNull()
    })
})
