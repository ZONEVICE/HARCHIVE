// =====================================================================================
// IMPORTS.
//
//  The seeder is an intern entity: no controller, no routes, no validators, no table, no
//  model of its own. It writes only through the services of the entities it seeds, never
//  through a repository or a model of theirs; where it needs a model, it asks the owning
//  entity to build one. A util.js is the other thing it may read, for their vocabulary.
// =====================================================================================

// The entities the seeder writes through.
const user_service = require('../user/service')
const permission_service = require('../permission/service')
const relation_service = require('../relation/service')
const metadata_service = require('../metadata/service')
const tag_service = require('../tag/service')

// The seeded account's name and first password.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../user/util')

// The names of the two default roles.
const { ADMINISTRATOR_PERMISSION_NAME, GUEST_PERMISSION_NAME } = require('../permission/util')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// THE SEED.
// =====================================================================================

/**
 * Everything the application needs in the database to boot, in the only order that works:
 *  the admin account and the default permissions first, the link between them last.
 *
 * Called once from index.js, after every table exists, on every boot, so every step is
 *  idempotent: a record already there is never written again, so a password the owner
 *  changed, edited administrator flags and an admin account deliberately moved to another
 *  permission all survive a restart.
 */
_.seed = () => {
    _.createAdminUser()
    _.createDefaultPermissions()
    _.linkAdminUser()
}

// =====================================================================================
// THE ADMIN ACCOUNT.
// =====================================================================================

// Creates the single account the project ships with, when it is missing. Calling it again on
//  an existing database does nothing. It does not fail loudly on its own: linkAdminUser below
//  cannot find the account either and stops the boot there, in one place.
_.createAdminUser = () => {
    // Already there: left exactly as it is, password included. user has no deleted family,
    //  so this one lookup is the whole guard.
    if (user_service.getAdminUser() !== null) return

    // Missing: the model is built by the entity that owns it, from its own vocabulary.
    const user = user_service.buildForCreate({ username: ADMIN_USERNAME, password: ADMIN_DEFAULT_PASSWORD })
    user_service.create(user)
}

// =====================================================================================
// THE DEFAULT PERMISSIONS.
// =====================================================================================

/**
 * Makes sure one default permission exists, and leaves it alone when it does.
 *
 * "Create it when the lookup finds nothing" is the trap: the ordinary lookup does not see a
 *  deleted permission, whose UNIQUE name would then make the create throw on every boot. So
 *  both families are asked, and the name is the only thing that decides.
 * @param {String} name The role name.
 * @param {String} entity The entity it is scoped to, or null for every entity.
 * @param {Boolean} can_read Whether the role may read.
 * @param {Boolean} can_create Whether the role may create.
 * @param {Boolean} can_edit Whether the role may edit.
 * @param {Boolean} can_delete Whether the role may delete.
 */
_.ensureDefaultPermission = (name, entity, can_read, can_create, can_edit, can_delete) => {
    // Live: never touched, so a deliberate change to its flags survives the restart.
    if (permission_service.getByName(name) !== null) return

    // Deleted: restored in place, with the flags it had.
    const deleted = permission_service.getDeletedByName(name)
    if (deleted !== null) return permission_service.restoreSoftDelete(deleted.id)

    // Missing: created, the model built by the entity that owns it.
    const permission = permission_service.buildForCreate({ name, entity, can_read, can_create, can_edit, can_delete })
    permission_service.create(permission)
}

// The two roles the application ships with, both global (entity: null): an administrator that
//  reaches every entity, and a guest that can read every one of them. Narrowing a role to one
//  entity is what the scope column is for, but that is the owner's decision, not a default
//  the seeder imposes.
_.createDefaultPermissions = () => {
    // Both ensures are idempotent.
    _.ensureDefaultPermission(ADMINISTRATOR_PERMISSION_NAME, null, true, true, true, true)
    _.ensureDefaultPermission(GUEST_PERMISSION_NAME, null, true, false, false, false)

    // Fail loudly: a backend without a live administrator permission is half-initialised and
    //  must not come up at all.
    if (permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME) === null) {
        console.error('Error: the administrator permission could not be created.')
        process.exit(1)
    }
}

// =====================================================================================
// THE LINK THAT GRANTS THE ADMIN ACCOUNT ITS RIGHTS.
// =====================================================================================

// Grants the administrator permission to the seeded account. A permission is attached to a
//  user through a relation record, never through a column, so this one step spans three
//  entities — which is exactly the kind of orchestration the seeder exists to hold.
_.linkAdminUser = () => {
    // Both ends of the link.
    const user = user_service.getAdminUser()
    const administrator = permission_service.getByName(ADMINISTRATOR_PERMISSION_NAME)

    // Fail loudly, for the same reason as above: there is nothing to grant rights to.
    if (user === null || administrator === null) {
        console.error('Error: the admin user could not be linked to the administrator permission.')
        process.exit(1)
    }

    // Any live permission already attached is enough to leave the account alone: an admin
    //  deliberately moved to another permission, or given scoped ones, keeps what it has.
    if (permission_service.getAllByUserId(user.id).length > 0) return

    // The link, built by the entity that owns it.
    const relation = relation_service.buildForCreate({
        id_1: user.id,
        entity_1: 'user',
        id_2: administrator.id,
        entity_2: 'permission',
        relation_type: 'linked',
        note: 'admin user granted the administrator permission'
    })

    // A deleted link to the same permission is brought back rather than duplicated, exactly as
    //  POST /api/relation/ does. Only when there is none is a new one created.
    const revived = relation_service.reviveDeletedTwin(relation)
    if (revived !== null) return

    relation_service.create(relation)
}

// =====================================================================================
// SEEDABLE METADATA AND TAGS.
//
//  Nothing below is called by seed(), on purpose. The application boots today without a
//  single seeded metadata record or tag, and *which* rows exist by default is the owner's
//  decision. They are written and tested ahead of it, so seeding one later is a single line
//  inside seed() and never a helper improvised in a hurry against a UNIQUE column.
// =====================================================================================

/**
 * Writes one metadata record, unconditionally.
 *
 * The raw create: no lookup, no guard, so a name already taken — by a live record or by a
 *  deleted one — throws on the UNIQUE column. At boot that means a crash on every restart,
 *  which is why anything running at boot uses ensureMetadataByName below.
 * @param {String} name The record name, in any casing.
 * @param {String} value The value to store.
 * @returns {Object} The stored row.
 */
_.createMetadata = (name, value) => {
    // The model is built by the entity that owns it.
    const metadata = metadata_service.buildForCreate({ name, value })
    return metadata_service.create(metadata)
}

/**
 * Makes sure one metadata record exists.
 *
 * **The name is the only thing it looks at.** A live record keeps the value it has, even when
 *  the value passed here is a different one: `value` is what the record is *created* with,
 *  never what it must always say, so a value the owner edited through the API survives every
 *  restart. Keying the lookup on name and value would be the other trap: a record whose value
 *  has since changed would look absent and be created again, over its taken name.
 * @param {String} name The record name, in any casing.
 * @param {String} value The value to create it with. A live record keeps the one it has.
 */
_.ensureMetadataByName = (name, value) => {
    // Live: left exactly as it is.
    if (metadata_service.getByName(name) !== null) return

    // Deleted: brought back with the value it had. metadata is keyed on the name.
    if (metadata_service.getDeletedByName(name) !== null) return metadata_service.restoreSoftDeleteByName(name)

    // Missing: created.
    _.createMetadata(name, value)
}

/**
 * Writes one tag, unconditionally. Same warning as createMetadata: no guard, so a name
 *  already taken throws on the UNIQUE column.
 * @param {String} name The tag name, in any casing.
 * @param {String} metadata Optional. The tag's own JSON blob, as text. Absent keeps the
 *  model default, '{}'.
 * @returns {Object} The stored row.
 */
_.createTag = (name, metadata) => {
    // The model is built by the entity that owns it.
    const tag = tag_service.buildForCreate({ name, metadata })
    return tag_service.create(tag)
}

/**
 * Makes sure one tag exists. The same rule as ensureMetadataByName, keyed the way tag is: a
 *  deleted tag is restored by its id.
 * @param {String} name The tag name, in any casing.
 * @param {String} metadata Optional. The JSON blob to create it with.
 */
_.ensureTagByName = (name, metadata) => {
    // Live: left exactly as it is.
    if (tag_service.getByName(name) !== null) return

    // Deleted: brought back by its id, with the blob it had.
    const deleted = tag_service.getDeletedByName(name)
    if (deleted !== null) return tag_service.restoreSoftDelete(deleted.id)

    // Missing: created.
    _.createTag(name, metadata)
}

module.exports = _
