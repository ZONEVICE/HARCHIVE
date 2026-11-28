// =====================================================================================
// MODEL.
//
//  A grant: the four CRUD verbs, plus the entity they apply to. It is attached to a user by
//  a `linked` relation, never by a column, so one row can be shared by many users. The field
//  order is the column order of CREATE TABLE and the argument order of setClass.
// =====================================================================================

class Permission {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    id = null

    // The identity key: UNIQUE, and normalised by the service before it ever reaches SQL.
    name = ''

    // The scope: the name of one entity, or null for a permission that applies to every one
    //  of them. It defaults to null, the widest scope, which is only safe because the four
    //  flags default to false — an unfilled permission reaches everywhere and grants nothing.
    entity = null

    // The four flags default to false on purpose: a permission that was never filled in locks
    //  its users out instead of handing them administrator rights.
    can_read = false
    can_create = false
    can_edit = false

    // Gates the DELETE routes, which are all soft deletes. Restoring and the physical purge are
    //  backend-only and deliberately have no flag of their own.
    can_delete = false

    // Epoch seconds when the permission was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored permission. Null for one the database has not seen.
     * @param {String} name The normalised name.
     * @param {String} entity Name of the entity the flags apply to, or null for all of them.
     * @param {Boolean} can_read Whether the holder may read, which covers downloading.
     * @param {Boolean} can_create Whether the holder may create.
     * @param {Boolean} can_edit Whether the holder may edit.
     * @param {Boolean} can_delete Whether the holder may delete a record.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when it is live.
     */
    setClass(id, name, entity, can_read, can_create, can_edit, can_delete, deleted_at) {
        this.id = id
        this.name = name
        this.entity = entity ?? null
        this.can_read = can_read
        this.can_create = can_create
        this.can_edit = can_edit
        this.can_delete = can_delete
        this.deleted_at = deleted_at ?? null
    }

    // One get/set pair per field, in the same order.
    getId() { return this.id }
    setId(v) { this.id = v }

    getName() { return this.name }
    setName(v) { this.name = v }

    getEntity() { return this.entity }
    setEntity(v) { this.entity = v }

    getCanRead() { return this.can_read }
    setCanRead(v) { this.can_read = v }

    getCanCreate() { return this.can_create }
    setCanCreate(v) { this.can_create = v }

    getCanEdit() { return this.can_edit }
    setCanEdit(v) { this.can_edit = v }

    getCanDelete() { return this.can_delete }
    setCanDelete(v) { this.can_delete = v }

    getDeletedAt() { return this.deleted_at }
    setDeletedAt(v) { this.deleted_at = v }
}

// =====================================================================================
// EXPORT.
// =====================================================================================

module.exports = Permission
