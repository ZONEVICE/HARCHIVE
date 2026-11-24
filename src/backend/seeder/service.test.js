// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test. An intern entity has no route, so its service is its whole surface.
const seeder_service = require('./service')

// The entities the seeder writes through, read back the same way.
const metadata_service = require('../metadata/service')
const tag_service = require('../tag/service')
const permission_service = require('../permission/service')
const relation_service = require('../relation/service')
const user_service = require('../user/service')

// The seeded account's name, and the names of the two default roles.
const { ADMIN_USERNAME } = require('../user/util')
const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('../permission/util')

// The shared connection, for the one question no service answers: how many rows hold a name.
const db = require('../core/db').getSharedConnection()

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Per-run names: both columns are UNIQUE, and other suites use the same database.
const RUN = Date.now()
const METADATA_NAME = `seeder-metadata-${RUN}`
const METADATA_RAW_NAME = `seeder-raw-metadata-${RUN}`
const TAG_NAME = `seeder-tag-${RUN}`
const TAG_RAW_NAME = `seeder-raw-tag-${RUN}`

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

// Rows holding one name, live or deleted, read straight from the table. A service hands back
//  one row, so it cannot tell "the record is there" apart from "a second one was created".
const countRowsNamed = (table, name) => db.prepare(`SELECT * FROM ${table} WHERE name = ?`).all(name).length

// Purges one tag this suite created, whether it ended live or deleted.
const purgeTag = (name) => {
    // A live tag answers the ordinary lookup, a deleted one only its twin.
    const tag = tag_service.getByName(name) ?? tag_service.getDeletedByName(name)
    if (tag !== null) tag_service.hardDelete(tag.id)
}

// =====================================================================================
// CLEANUP.
// =====================================================================================

// Purges what this suite created, whatever state it ended in, and puts back anything it broke
//  on purpose: the default-permission block deletes `guest` and the admin's link, and the
//  running server must not be left without them if an assertion failed before the restore.
afterAll(() => {
    metadata_service.hardDeleteByName(METADATA_NAME)
    metadata_service.hardDeleteByName(METADATA_RAW_NAME)
    purgeTag(TAG_NAME)
    purgeTag(TAG_RAW_NAME)

    seeder_service.seed()
})

// =====================================================================================
// SEEDABLE METADATA AND TAGS.
// =====================================================================================

describe('createMetadata', () => {
    it('writes the record and answers the stored row, name folded', () => {
        const created = seeder_service.createMetadata(METADATA_RAW_NAME.toUpperCase(), 'raw value')
        expect(created.name).toBe(METADATA_RAW_NAME)
        expect(created.value).toBe('raw value')
    })

    it('throws on a name already taken: it is the raw write, with no guard', () => {
        expect(() => seeder_service.createMetadata(METADATA_RAW_NAME, 'again')).toThrow()
    })
})

describe('ensureMetadataByName', () => {
    it('creates the record when it is missing', () => {
        seeder_service.ensureMetadataByName(METADATA_NAME, 'first value')
        expect(metadata_service.getByName(METADATA_NAME).value).toBe('first value')
    })

    it('leaves a live record alone, even when the value differs', () => {
        seeder_service.ensureMetadataByName(METADATA_NAME.toUpperCase(), 'another value')
        expect(metadata_service.getByName(METADATA_NAME).value).toBe('first value')
        expect(countRowsNamed('metadata', METADATA_NAME)).toBe(1)
    })

    it('restores a deleted record instead of re-creating it', () => {
        const before = metadata_service.getByName(METADATA_NAME)
        metadata_service.softDeleteByName(METADATA_NAME)

        seeder_service.ensureMetadataByName(METADATA_NAME, 'another value')

        // Same row, same value: brought back, not written again.
        const after = metadata_service.getByName(METADATA_NAME)
        expect(after.id).toBe(before.id)
        expect(after.value).toBe('first value')
        expect(countRowsNamed('metadata', METADATA_NAME)).toBe(1)
    })
})

describe('createTag', () => {
    it('writes the tag with the default blob when none is given', () => {
        const created = seeder_service.createTag(TAG_RAW_NAME)
        expect(created.name).toBe(TAG_RAW_NAME)
        expect(created.metadata).toBe('{}')
    })

    it('throws on a name already taken: it is the raw write, with no guard', () => {
        expect(() => seeder_service.createTag(TAG_RAW_NAME.toUpperCase())).toThrow()
    })
})

describe('ensureTagByName', () => {
    it('creates the tag when it is missing, with the blob given', () => {
        seeder_service.ensureTagByName(TAG_NAME, '{"seeded":true}')
        expect(tag_service.getByName(TAG_NAME).metadata).toBe('{"seeded":true}')
    })

    it('leaves a live tag alone, even when the blob differs', () => {
        seeder_service.ensureTagByName(TAG_NAME, '{"seeded":false}')
        expect(tag_service.getByName(TAG_NAME).metadata).toBe('{"seeded":true}')
        expect(countRowsNamed('tag', TAG_NAME)).toBe(1)
    })

    it('restores a deleted tag by its id, whatever case the name comes in', () => {
        const before = tag_service.getByName(TAG_NAME)
        tag_service.softDelete(before.id)

        seeder_service.ensureTagByName(TAG_NAME.toUpperCase())

        expect(tag_service.getByName(TAG_NAME).id).toBe(before.id)
        expect(countRowsNamed('tag', TAG_NAME)).toBe(1)
    })
})

// =====================================================================================
// THE DEFAULT ROWS.
// =====================================================================================

describe('createAdminUser', () => {
    it('is idempotent: calling it twice leaves one admin account', () => {
        // user.username is UNIQUE, but the guard is what keeps the boot from throwing on it.
        seeder_service.createAdminUser()
        seeder_service.createAdminUser()

        const admin_rows = db.prepare('SELECT * FROM user WHERE username = ?').all(user_service.normalizeUsername(ADMIN_USERNAME))
        expect(admin_rows.length).toBe(1)
    })
})

describe('createDefaultPermissions', () => {
    it('restores a deleted default permission in place instead of re-creating it', () => {
        // The trap the whole ensure shape is built around: a deleted row still holds its UNIQUE
        //  name, so re-creating it would throw and leave the backend without its role.
        const before = permission_service.getByName(GUEST_PERMISSION_NAME)
        permission_service.softDelete(before.id)
        expect(permission_service.getByName(GUEST_PERMISSION_NAME)).toBeNull()

        seeder_service.createDefaultPermissions()

        // Restored with the flags it had: the seed never overwrites a row it did not create.
        const after = permission_service.getByName(GUEST_PERMISSION_NAME)
        expect(after).toEqual(before)
    })

    it('leaves a live permission untouched', () => {
        const before = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)

        seeder_service.createDefaultPermissions()

        expect(permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)).toEqual(before)
    })
})

describe('linkAdminUser', () => {
    it('brings back a deleted admin link instead of creating a second one', () => {
        const admin = user_service.getAdminUser()
        const administrator = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)

        // The link that grants the admin its rights, found among its live relations.
        const relation = relation_service.getByEntityId(admin.id).find((row) => {
            return row.entity_1 === 'user' && row.id_1 === admin.id && row.id_2 === administrator.id && row.relation_type === 'linked'
        })
        relation_service.softDelete(relation.id)
        expect(permission_service.getAllByUserId(admin.id)).toEqual([])

        seeder_service.linkAdminUser()

        // The same row, live again.
        expect(relation_service.getById(relation.id)).not.toBeNull()
        expect(permission_service.can(admin.id, 'delete', 'permission')).toBe(true)
    })
})

// =====================================================================================
// THE SEED.
// =====================================================================================

describe('seed', () => {
    it('runs whole and leaves the boot invariants in place', () => {
        seeder_service.seed()

        const admin = user_service.getAdminUser()
        expect(admin.username_cased).toBe(ADMIN_USERNAME)
        expect(permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)).not.toBeNull()
        expect(permission_service.getByName(GUEST_PERMISSION_NAME)).not.toBeNull()
        expect(permission_service.getAllByUserId(admin.id).length).toBeGreaterThan(0)
    })

    it('is idempotent: a second run leaves one row per default and the same links', () => {
        // seed() runs on every boot, so a step that lost its guard would corrupt the database a
        //  little more each restart. Calling it twice is the test.
        const admin = user_service.getAdminUser()
        const links_before = relation_service.getByEntityId(admin.id).length

        seeder_service.seed()
        seeder_service.seed()

        expect(countRowsNamed('permission', ADMINISTRATOR_PERMISSION_NAME)).toBe(1)
        expect(countRowsNamed('permission', GUEST_PERMISSION_NAME)).toBe(1)
        expect(relation_service.getByEntityId(admin.id).length).toBe(links_before)
    })
})
