// =====================================================================================
// MODEL.
//
//  A grant: the four CRUD verbs, plus the entity they apply to. It is attached to a user by
//  a `linked` relation, never by a column, so one row can be shared by many users. The field
//  order is the column order of CREATE TABLE and the argument order of setClass.
// =====================================================================================

class Permission {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null

    // The identity key: UNIQUE, and normalised by the service before it ever reaches SQL.
    #name = ''

    // The scope: the name of one entity, or null for a permission that applies to every one
    //  of them. It defaults to null, the widest scope, which is only safe because the four
    //  flags default to false — an unfilled permission reaches everywhere and grants nothing.
    #entity = null

    // The four flags default to false on purpose: a permission that was never filled in locks
    //  its users out instead of handing them administrator rights.
    #can_read = false
    #can_create = false
    #can_edit = false

    // Gates the DELETE routes, which are all soft deletes. Restoring and the physical purge are
    //  backend-only and deliberately have no flag of their own.
    #can_delete = false

    // Epoch seconds when the permission was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    #deleted_at = null

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
        this.#id = id
        this.#name = name
        this.#entity = entity ?? null
        this.#can_read = can_read
        this.#can_create = can_create
        this.#can_edit = can_edit
        this.#can_delete = can_delete
        this.#deleted_at = deleted_at ?? null
    }

    // One getter/setter pair per field, in the same order.
    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get entity() { return this.#entity }
    set entity(v) { this.#entity = v }

    get can_read() { return this.#can_read }
    set can_read(v) { this.#can_read = v }

    get can_create() { return this.#can_create }
    set can_create(v) { this.#can_create = v }

    get can_edit() { return this.#can_edit }
    set can_edit(v) { this.#can_edit = v }

    get can_delete() { return this.#can_delete }
    set can_delete(v) { this.#can_delete = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = Permission
