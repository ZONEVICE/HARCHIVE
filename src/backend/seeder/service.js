// The seeder is an intern entity: it owns no table, no model and no HTTP surface. What it owns
//  is one operation — put into the database the records the application cannot run without —
//  and that operation spans user, permission and relation. It reaches every one of them through
//  its service, the public surface, and never through a repository or a model.
const user_service = require('../user/service')
const permission_service = require('../permission/service')
const relation_service = require('../relation/service')
const metadata_service = require('../metadata/service')
const tag_service = require('../tag/service')

const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')
const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('../permission/util')

const _ = {}

// Everything the application needs in the database to boot, in the only order that works: the
//  admin user and the default permissions first, the link between them last. Called from
//  index.js once every table exists. Idempotent — it runs on every boot and never overwrites a
//  record that is already there.
_.seed = () => {
    _.createAdminUser()
    _.createDefaultPermissions()
    _.linkAdminUser()
}

// --------------------------------------------------------------------------------
// The admin user.
// --------------------------------------------------------------------------------

// The project ships with a single admin account, created when it is missing. Calling it again
//  on an existing database does nothing, so a password the owner changed survives a restart.
//  It does not fail loudly on its own: linkAdminUser below cannot find the account either and
//  stops the boot there, in one place.
_.createAdminUser = () => {
    if (user_service.getAdminUser() !== null) return

    const user = user_service.buildForCreate({ username: ADMIN_USERNAME, password: ADMIN_DEFAULT_PASSWORD })
    user_service.create(user)
}

// --------------------------------------------------------------------------------
// The default permissions.
// --------------------------------------------------------------------------------

// Creates one default permission when it is missing, and does nothing when a live row already
//  holds the name — an existing permission is never overwritten, so a deliberate change to its
//  flags survives a restart.
//
// The naive "create it if getByName finds nothing" check would be wrong here: a soft-deleted
//  row still holds its UNIQUE name and is still returned by reads, so a permission sitting in
//  the trash would pass the check silently and leave the system without an administrator, and
//  re-creating the name would hit the UNIQUE constraint and throw. A trashed default row is
//  restored instead, keeping the flags it had.
_.ensureDefaultPermission = (name, entity, can_read, can_create, can_edit, can_delete) => {
    const current = permission_service.getByName(name)

    if (current !== null && current.deleted_at === null) return
    if (current !== null) return permission_service.restoreFromTrashCan(current.id)

    const permission = permission_service.buildForCreate({ name, entity, can_read, can_create, can_edit, can_delete })
    permission_service.create(permission)
}

// The two roles the application ships with. Both are global (`entity: null`), which is what the
//  application needs to boot: an administrator that reaches every entity, and a guest that can
//  read every entity. Narrowing a role to one entity is what the scope column is for, but that
//  is a decision the owner makes, not a default the seeder imposes.
//  Idempotent: it runs on every boot.
_.createDefaultPermissions = () => {
    _.ensureDefaultPermission(ADMINISTRATOR_PERMISSION_NAME, null, true, true, true, true)
    _.ensureDefaultPermission(GUEST_PERMISSION_NAME, null, true, false, false, false)

    // Fail loudly: a backend without a live administrator permission is half-initialised and
    //  must not come up at all.
    const administrator = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)
    if (administrator === null || administrator.deleted_at !== null) {
        console.error('Error: the administrator permission could not be created.')
        process.exit(1)
    }
}

// --------------------------------------------------------------------------------
// The link that grants the admin user its rights.
// --------------------------------------------------------------------------------

// Grants the administrator permission to the seeded admin user. A permission is attached to a
//  user through a relation record, never through a column, so this one call spans all three
//  entities — which is exactly the kind of orchestration the seeder exists to hold.
//  Idempotent, and it never overrides an existing link: an admin user deliberately moved to
//  another permission keeps it.
_.linkAdminUser = () => {
    const user = user_service.getAdminUser()
    const administrator = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)

    if (user === null || administrator === null) {
        console.error('Error: the admin user could not be linked to the administrator permission.')
        process.exit(1)
    }

    // Any live permission already attached is enough to leave the account alone: an admin user
    //  deliberately moved to another permission, or given scoped ones, keeps what it has.
    if (permission_service.getAllByUserId(user.id).length > 0) return

    const relation = relation_service.buildForCreate({
        id_1: user.id,
        entity_1: 'user',
        id_2: administrator.id,
        entity_2: 'permission',
        relation_type: 'linked',
        note: 'admin user granted the administrator permission'
    })
    relation_service.create(relation)
}

// --------------------------------------------------------------------------------
// Seedable metadata and tags.
//
// Nothing below is called by seed(): the application boots today without a single seeded
//  metadata record or tag, and adding one is a decision the owner makes. They live here,
//  written and tested ahead of that decision, so seeding one later is a single line inside
//  seed() and never a new helper written in a hurry.
//
// Both entities own a UNIQUE name, so both walk into the trap the soft delete sets — the same
//  one ensureDefaultPermission above is built around. Read that comment first: the shape here
//  is deliberately identical.
// --------------------------------------------------------------------------------

// Writes one metadata record, unconditionally. It is the raw create — no guard, no lookup — so
//  calling it for a name that already exists (trash can included) throws on the UNIQUE column.
//  Use ensureMetadataByName below for anything that runs at boot.
_.createMetadata = (name, value) => {
    const metadata = metadata_service.buildForCreate({ name, value })
    metadata_service.create(metadata)
}

// Creates the record when it is missing, restores it when it sits in the trash can, and does
//  nothing at all when a live row already holds the name.
//
// **The name is the only thing it looks at.** A live record keeps the value it has, even when
//  the value passed here is a different one: `value` is what the record was *created* with, not
//  what it must always say, so a value the owner edited through the API survives every restart.
//  Seeding is "make sure this record exists", never "put this record back the way I wrote it" —
//  the same rule ensureDefaultPermission follows with the four flags. Overwriting a stored value
//  needs a deliberate update, not a boot.
_.ensureMetadataByName = (name, value) => {
    const current = metadata_service.getByName(name)

    if (current !== null && current.deleted_at === null) return
    if (current !== null) return metadata_service.restoreFromTrashCanByName(name)

    _.createMetadata(name, value)
}

// Writes one tag, unconditionally. Same warning as createMetadata: no guard, so a name already
//  taken — by a live tag or by one in the trash can — throws on the UNIQUE column. The metadata
//  argument is the tag's own JSON blob (unrelated to the metadata entity) and may be omitted,
//  which keeps the model default of '{}'.
_.createTag = (name, metadata) => {
    const tag = tag_service.buildForCreate({ name, metadata })
    tag_service.create(tag)
}

// The tag counterpart of ensureMetadataByName, rule for rule: the name decides, a live tag is
//  left exactly as it is, and a trashed one is restored rather than re-created.
//
// One difference, and it comes from the schema: tag.name is UNIQUE COLLATE NOCASE, so the lookup
//  ignores case and `Portrait` finds the tag stored as `portrait`. metadata.name has no
//  collation, so there the two are different records.
_.ensureTagByName = (name, metadata) => {
    const current = tag_service.getByName(name)

    if (current !== null && current.deleted_at === null) return
    if (current !== null) return tag_service.restoreFromTrashCan(current.id)

    _.createTag(name, metadata)
}

module.exports = _
