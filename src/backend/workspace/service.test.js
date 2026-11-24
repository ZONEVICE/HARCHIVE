// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const workspace_service = require('./service')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// The workspace this suite deletes and brings back.
const SAMPLE = { name: `Home service-${RUN}`, path_absolute: `/home/v/service-${RUN}/`, path_relative: `v/service-${RUN}/` }

// =====================================================================================
// STATE.
// =====================================================================================

// Id of the workspace the suite deletes and brings back. Known once beforeAll has created it.
let deleted_id = null

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// A workspace that starts every test below deleted.
beforeAll(() => {
    const created = workspace_service.create(workspace_service.buildForCreate(SAMPLE))
    deleted_id = created.id
    workspace_service.softDelete(deleted_id)
})

// Purges the workspace whatever state the tests left it in. The other one purges itself.
afterAll(() => {
    workspace_service.hardDelete(deleted_id)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('getDeletedById', () => {
    it('finds the deleted workspace that the ordinary read cannot see', () => {
        expect(workspace_service.getById(deleted_id)).toBeNull()
        expect(workspace_service.getDeletedById(deleted_id).name).toBe(SAMPLE.name)
    })

    it('answers null for an id nobody holds', () => {
        expect(workspace_service.getDeletedById(999999999)).toBeNull()
    })
})

describe('getDeletedAll', () => {
    it('lists the deleted workspace and no live one', () => {
        const rows = workspace_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted_id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })
})

describe('getDeletedByPathAbsolute', () => {
    it('finds it by path, trimmed and composed', () => {
        expect(workspace_service.getDeletedByPathAbsolute(`  ${SAMPLE.path_absolute}  `).id).toBe(deleted_id)
    })

    it('does not fold the case of the path', () => {
        expect(workspace_service.getDeletedByPathAbsolute(SAMPLE.path_absolute.toUpperCase())).toBeNull()
    })
})

describe('getByPathAbsolute', () => {
    it('answers null for a deleted workspace, which only its twin sees', () => {
        expect(workspace_service.getByPathAbsolute(SAMPLE.path_absolute)).toBeNull()
    })
})

describe('restoreSoftDelete', () => {
    it('brings the same row back to life, every value untouched', () => {
        const restored = workspace_service.restoreSoftDelete(deleted_id)
        expect(restored).toEqual({ ...workspace_service.getById(deleted_id), deleted_at: null })
        expect(restored.id).toBe(deleted_id)
        expect(restored.name).toBe(SAMPLE.name)
    })

    it('answers null on a workspace that is live', () => {
        expect(workspace_service.restoreSoftDelete(deleted_id)).toBeNull()
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDelete', () => {
    it('removes the row from both families', () => {
        const created = workspace_service.create(workspace_service.buildForCreate({ ...SAMPLE, path_absolute: `/home/purged/${RUN}/` }))

        workspace_service.hardDelete(created.id)

        expect(workspace_service.getById(created.id)).toBeNull()
        expect(workspace_service.getDeletedById(created.id)).toBeNull()
    })
})
