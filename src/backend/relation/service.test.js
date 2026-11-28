// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const relation_service = require('./service')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// Synthetic ends, derived from the run so two runs never build the same five values.
const BASE_ID = 600000000 + (RUN % 100000000)

// The relation the suite deletes and brings back.
const SAMPLE = { id_1: BASE_ID + 1, entity_1: 'file', id_2: BASE_ID + 2, entity_2: 'tag', relation_type: 'tagged', note: `service ${RUN}` }

// =====================================================================================
// STATE.
// =====================================================================================

// Id of the relation the suite deletes and brings back. Known once beforeAll has created it.
let deleted_id = null

// Ids of every other relation this suite creates, purged in afterAll.
const CREATED_IDS = []

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// A relation that starts every test below deleted.
beforeAll(() => {
    const created = relation_service.create(relation_service.buildForCreate(SAMPLE))
    deleted_id = created.id
    relation_service.softDelete(deleted_id)
})

// Purges what this suite created, whatever state the tests left it in.
afterAll(() => {
    relation_service.hardDelete(deleted_id)
    for (const id of CREATED_IDS) relation_service.hardDelete(id)
})

// =====================================================================================
// DELETED RECORDS.
// =====================================================================================

describe('getDeletedById', () => {
    it('finds the deleted relation that the ordinary read cannot see', () => {
        expect(relation_service.getById(deleted_id)).toBeNull()
        expect(relation_service.getDeletedById(deleted_id).note).toBe(SAMPLE.note)
    })
})

describe('getDeletedAll', () => {
    it('lists the deleted relation and no live one', () => {
        const rows = relation_service.getDeletedAll()
        expect(rows.some((row) => row.id === deleted_id)).toBe(true)
        expect(rows.every((row) => row.deleted_at !== null)).toBe(true)
    })
})

describe('getDeletedByEntity', () => {
    it('finds it from either side, and the live family does not', () => {
        expect(relation_service.getDeletedByEntity('file').some((row) => row.id === deleted_id)).toBe(true)
        expect(relation_service.getDeletedByEntity('tag').some((row) => row.id === deleted_id)).toBe(true)
        expect(relation_service.getByEntity('tag').some((row) => row.id === deleted_id)).toBe(false)
    })
})

describe('getDeletedByEntityId', () => {
    it('finds it from either side, and the live family does not', () => {
        expect(relation_service.getDeletedByEntityId(SAMPLE.id_1).map((row) => row.id)).toEqual([deleted_id])
        expect(relation_service.getDeletedByEntityId(SAMPLE.id_2).map((row) => row.id)).toEqual([deleted_id])
        expect(relation_service.getByEntityId(SAMPLE.id_1)).toEqual([])
    })
})

describe('getDeletedByEnds', () => {
    it('finds it by its five identifying values, and the live lookup does not', () => {
        expect(relation_service.getDeletedByEnds(relation_service.buildForCreate(SAMPLE)).id).toBe(deleted_id)
        expect(relation_service.getByEnds(relation_service.buildForCreate(SAMPLE))).toBeNull()
    })

    it('answers the most recent of several deleted twins', () => {
        // Two deleted rows with the same ends can exist when the backend writes past the POST
        //  guard; the newest id answers, so the choice is a rule and not rowid luck.
        const body = { ...SAMPLE, id_2: BASE_ID + 3 }
        const older = relation_service.create(relation_service.buildForCreate(body))
        const newer = relation_service.create(relation_service.buildForCreate(body))
        CREATED_IDS.push(older.id, newer.id)
        relation_service.softDelete(newer.id)
        relation_service.softDelete(older.id)

        expect(relation_service.getDeletedByEnds(relation_service.buildForCreate(body)).id).toBe(newer.id)
    })
})

describe('restoreSoftDelete', () => {
    it('brings the same row back to life, every value untouched', () => {
        const restored = relation_service.restoreSoftDelete(deleted_id)
        expect(restored).toEqual({ ...SAMPLE, id: deleted_id, deleted_at: null })
        expect(relation_service.getById(deleted_id)).toEqual(restored)
    })

    it('answers null on a relation that is live', () => {
        expect(relation_service.restoreSoftDelete(deleted_id)).toBeNull()
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDelete', () => {
    it('removes the row from both families', () => {
        const created = relation_service.create(relation_service.buildForCreate({ ...SAMPLE, id_2: BASE_ID + 4 }))

        relation_service.hardDelete(created.id)

        expect(relation_service.getById(created.id)).toBeNull()
        expect(relation_service.getDeletedById(created.id)).toBeNull()
    })
})
