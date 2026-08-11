// The seeder is the project's only intern entity: no routes, no controller, no validators, no
//  HTTP surface at all. So this is the one test file in the backend that drives an entity by
//  **calling its service directly** instead of sending requests to the running server. There is
//  nothing to drive over axios here, and mocking a boot to observe it would test the mock.
//
// Two consequences worth keeping in mind while reading it. It needs no session, no cookie and no
//  server — it talks to the same database the server is using, through the shared connection.
//  And it writes into two entities it does not own (metadata and tag), so every record it makes
//  carries a per-run suffix and is purged in afterAll: no table is ever wiped here, exactly as
//  permission.test.js refuses to wipe its own.

const seeder_service = require('./service')

// The entities the seeder writes through. It reaches them by their service — their public
//  surface — so the assertions read them the same way.
const metadata_service = require('../metadata/service')
const tag_service = require('../tag/service')
const permission_service = require('../permission/service')
const user_service = require('../user/service')

const { ADMIN_USERNAME } = require('../core/constants')
const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('../permission/util')

const db = require('../core/db').getSharedConnection()

// Per-run names. metadata.name and tag.name are both UNIQUE, and this file runs against a
//  database other suites are using, so nothing here may collide with a record left behind.
const RUN = Date.now()
const METADATA_NAME = `seeder-metadata-${RUN}`
const METADATA_NAME_OTHER_CASE = METADATA_NAME.toUpperCase()
const METADATA_ENSURED_NAME = `seeder-ensured-metadata-${RUN}`
const TAG_NAME = `seeder-tag-${RUN}`
const TAG_NAME_OTHER_CASE = TAG_NAME.toUpperCase()
const TAG_ENSURED_NAME = `seeder-ensured-tag-${RUN}`
const TAG_CREATED_BY_ENSURE_NAME = `seeder-new-tag-${RUN}`

const METADATA_NAMES = [METADATA_NAME, METADATA_NAME_OTHER_CASE, METADATA_ENSURED_NAME]
const TAG_NAMES = [TAG_NAME, TAG_NAME_OTHER_CASE, TAG_ENSURED_NAME, TAG_CREATED_BY_ENSURE_NAME]

// Rows carrying one name, read straight from the database. The services answer with a single
//  row, which cannot tell "one record" apart from "a second one was created".
const countRowsNamed = (table, name) => db.prepare(`SELECT * FROM ${table} WHERE name = ?`).all(name).length

afterAll(() => {
    // Purge what this file created. Both hard deletes are backend-only primitives, which is
    //  precisely the case they exist for.
    for (const name of METADATA_NAMES) metadata_service.hardDeleteByName(name)
    for (const name of TAG_NAMES) {
        const tag = tag_service.getByName(name)
        if (tag !== null) tag_service.hardDelete(tag.id)
    }

    // Safety net: the default-permission block below soft-deletes `guest` on purpose. If one of
    //  its assertions failed before the restore, the running server would be left with a default
    //  role in the trash until the next boot.
    seeder_service.createDefaultPermissions()
})

describe('Seeder Tests', () => {
    describe('createMetadata', () => {
        it('Creates the record', () => {
            seeder_service.createMetadata(METADATA_NAME, 'first value')

            const metadata = metadata_service.getByName(METADATA_NAME)
            expect(metadata).not.toBeNull()
            expect(typeof metadata.id).toBe('number')
            expect(metadata.name).toBe(METADATA_NAME)
            expect(metadata.value).toBe('first value')
            expect(metadata.deleted_at).toBeNull()
        })
        it('Refuses a name already taken', () => {
            // The raw create has no guard, which is the whole reason ensureMetadataByName exists:
            //  called at boot, this is a UNIQUE constraint throwing on every restart.
            expect(() => seeder_service.createMetadata(METADATA_NAME, 'another value')).toThrow()
            expect(countRowsNamed('metadata', METADATA_NAME)).toBe(1)
        })
    })

    describe('ensureMetadataByName', () => {
        it('Creates the record when it is missing', () => {
            expect(metadata_service.getByName(METADATA_ENSURED_NAME)).toBeNull()

            seeder_service.ensureMetadataByName(METADATA_ENSURED_NAME, 'ensured value')

            const metadata = metadata_service.getByName(METADATA_ENSURED_NAME)
            expect(metadata).not.toBeNull()
            expect(metadata.value).toBe('ensured value')
            expect(metadata.deleted_at).toBeNull()
        })
        it('Leaves a live record alone, even when the value differs', () => {
            // The rule this function is built for. The name is the only thing that decides, so a
            //  second boot never re-creates the record because its value has moved on — and an
            //  edit the owner made through the API survives every restart.
            const before = metadata_service.getByName(METADATA_ENSURED_NAME)

            seeder_service.ensureMetadataByName(METADATA_ENSURED_NAME, 'a completely different value')

            const after = metadata_service.getByName(METADATA_ENSURED_NAME)
            expect(after.id).toBe(before.id)
            expect(after.value).toBe('ensured value')
            expect(countRowsNamed('metadata', METADATA_ENSURED_NAME)).toBe(1)
        })
        it('Is idempotent across repeated boots', () => {
            seeder_service.ensureMetadataByName(METADATA_ENSURED_NAME, 'ensured value')
            seeder_service.ensureMetadataByName(METADATA_ENSURED_NAME, 'ensured value')
            seeder_service.ensureMetadataByName(METADATA_ENSURED_NAME, 'ensured value')

            expect(countRowsNamed('metadata', METADATA_ENSURED_NAME)).toBe(1)
        })
        it('Restores a record sitting in the trash can instead of re-creating it', () => {
            const before = metadata_service.getByName(METADATA_ENSURED_NAME)
            metadata_service.softDeleteByName(METADATA_ENSURED_NAME)
            expect(metadata_service.getByName(METADATA_ENSURED_NAME).deleted_at).not.toBeNull()

            seeder_service.ensureMetadataByName(METADATA_ENSURED_NAME, 'a completely different value')

            const after = metadata_service.getByName(METADATA_ENSURED_NAME)
            expect(after.deleted_at).toBeNull()
            // Same row, same value: restored, not written again. A trashed record still holds its
            //  UNIQUE name, so re-creating it would have thrown.
            expect(after.id).toBe(before.id)
            expect(after.value).toBe('ensured value')
            expect(countRowsNamed('metadata', METADATA_ENSURED_NAME)).toBe(1)
        })
        it('Tells two names apart by case', () => {
            // metadata.name has no COLLATE NOCASE, unlike tag.name, so these are two records.
            seeder_service.ensureMetadataByName(METADATA_NAME_OTHER_CASE, 'upper case value')

            const lower = metadata_service.getByName(METADATA_NAME)
            const upper = metadata_service.getByName(METADATA_NAME_OTHER_CASE)
            expect(upper.id).not.toBe(lower.id)
            expect(upper.value).toBe('upper case value')
            expect(lower.value).toBe('first value')
        })
    })

    describe('createTag', () => {
        it('Creates the tag', () => {
            seeder_service.createTag(TAG_NAME, '{"color":"blue"}')

            const tag = tag_service.getByName(TAG_NAME)
            expect(tag).not.toBeNull()
            expect(typeof tag.id).toBe('number')
            expect(tag.name).toBe(TAG_NAME)
            expect(tag.metadata).toBe('{"color":"blue"}')
            expect(tag.deleted_at).toBeNull()
        })
        it('Keeps the model default when no metadata blob is given', () => {
            seeder_service.createTag(TAG_ENSURED_NAME)

            const tag = tag_service.getByName(TAG_ENSURED_NAME)
            expect(tag.metadata).toBe('{}')
        })
        it('Refuses a name already taken', () => {
            expect(() => seeder_service.createTag(TAG_NAME, '{}')).toThrow()
            expect(countRowsNamed('tag', TAG_NAME)).toBe(1)
        })
        it('Refuses a name already taken in another case', () => {
            // UNIQUE COLLATE NOCASE: the column itself refuses it, not a check in JavaScript.
            expect(() => seeder_service.createTag(TAG_NAME_OTHER_CASE, '{}')).toThrow()
        })
    })

    describe('ensureTagByName', () => {
        it('Leaves a live tag alone, even when the metadata blob differs', () => {
            const before = tag_service.getByName(TAG_NAME)

            seeder_service.ensureTagByName(TAG_NAME, '{"color":"red"}')

            const after = tag_service.getByName(TAG_NAME)
            expect(after.id).toBe(before.id)
            expect(after.metadata).toBe('{"color":"blue"}')
            expect(countRowsNamed('tag', TAG_NAME)).toBe(1)
        })
        it('Matches the name whatever the case', () => {
            // Where ensureMetadataByName would have created a second record, this one recognises
            //  the tag it already seeded: the lookup runs on a COLLATE NOCASE column.
            seeder_service.ensureTagByName(TAG_NAME_OTHER_CASE, '{}')

            expect(countRowsNamed('tag', TAG_NAME)).toBe(1)
            expect(tag_service.getByName(TAG_NAME_OTHER_CASE).metadata).toBe('{"color":"blue"}')
        })
        it('Is idempotent across repeated boots', () => {
            seeder_service.ensureTagByName(TAG_ENSURED_NAME, '{}')
            seeder_service.ensureTagByName(TAG_ENSURED_NAME, '{}')
            seeder_service.ensureTagByName(TAG_ENSURED_NAME, '{}')

            expect(countRowsNamed('tag', TAG_ENSURED_NAME)).toBe(1)
        })
        it('Creates the tag when it is missing', () => {
            expect(tag_service.getByName(TAG_CREATED_BY_ENSURE_NAME)).toBeNull()

            seeder_service.ensureTagByName(TAG_CREATED_BY_ENSURE_NAME, '{"seeded":true}')

            const tag = tag_service.getByName(TAG_CREATED_BY_ENSURE_NAME)
            expect(tag).not.toBeNull()
            expect(tag.metadata).toBe('{"seeded":true}')
            expect(tag.deleted_at).toBeNull()
        })
        it('Restores a tag sitting in the trash can instead of re-creating it', () => {
            const before = tag_service.getByName(TAG_NAME)
            tag_service.softDelete(before.id)
            expect(tag_service.getByName(TAG_NAME).deleted_at).not.toBeNull()

            seeder_service.ensureTagByName(TAG_NAME, '{"color":"green"}')

            const after = tag_service.getByName(TAG_NAME)
            expect(after.deleted_at).toBeNull()
            expect(after.id).toBe(before.id)
            expect(after.metadata).toBe('{"color":"blue"}')
            expect(countRowsNamed('tag', TAG_NAME)).toBe(1)
        })
    })

    describe('createDefaultPermissions', () => {
        it('Restores a default permission from the trash can instead of re-creating it', () => {
            // The trap the whole ensure shape is built around, and the only place the suite
            //  exercises it without restarting the server: a trashed row still holds its UNIQUE
            //  name, so re-creating it would throw and leave the backend without its role.
            const before = permission_service.getByName(GUEST_PERMISSION_NAME)
            permission_service.softDelete(before.id)
            expect(permission_service.getByName(GUEST_PERMISSION_NAME).deleted_at).not.toBeNull()

            seeder_service.createDefaultPermissions()

            const after = permission_service.getByName(GUEST_PERMISSION_NAME)
            expect(after.deleted_at).toBeNull()
            expect(after.id).toBe(before.id)
            // Restored with the flags it had: the seed never overwrites a row it did not create
            //  on this boot.
            expect(after.can_read).toBe(before.can_read)
            expect(after.can_create).toBe(before.can_create)
            expect(after.can_edit).toBe(before.can_edit)
            expect(after.can_delete).toBe(before.can_delete)
        })
        it('Leaves a live permission untouched', () => {
            const before = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)

            seeder_service.createDefaultPermissions()

            const after = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)
            expect(after.id).toBe(before.id)
            expect(after.entity).toBeNull()
            expect(after.can_read).toBe(true)
            expect(after.can_create).toBe(true)
            expect(after.can_edit).toBe(true)
            expect(after.can_delete).toBe(true)
        })
    })

    describe('seed', () => {
        it('Runs whole and leaves the boot invariants in place', () => {
            seeder_service.seed()

            const admin = user_service.getAdminUser()
            expect(admin).not.toBeNull()
            expect(admin.username).toBe(ADMIN_USERNAME)
            expect(permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME).deleted_at).toBeNull()
            expect(permission_service.getByName(GUEST_PERMISSION_NAME).deleted_at).toBeNull()
            expect(permission_service.getAllByUserId(admin.id).length).toBeGreaterThan(0)
        })
        it('Is idempotent: a second run changes nothing', () => {
            // seed() runs on every boot, so a step that lost its guard would corrupt the database
            //  a little more each restart. Calling it twice is the test — one call would only
            //  repeat the one above.
            const admin = user_service.getAdminUser()
            const permissions_before = permission_service.getAllByUserId(admin.id).length

            seeder_service.seed()
            seeder_service.seed()

            const admin_rows = db.prepare('SELECT * FROM user WHERE username = ?').all(ADMIN_USERNAME)
            expect(admin_rows.length).toBe(1)
            expect(countRowsNamed('permission', ADMINISTRATOR_PERMISSION_NAME)).toBe(1)
            expect(countRowsNamed('permission', GUEST_PERMISSION_NAME)).toBe(1)
            expect(permission_service.getAllByUserId(admin.id).length).toBe(permissions_before)
        })
    })
})
