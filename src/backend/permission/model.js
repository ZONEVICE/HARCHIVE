class Permission {
    // The id is assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null
    #name = ''
    // The four flags default to false on purpose: a permission that was never filled in
    //  locks its users out instead of handing them administrator rights.
    #can_read = false
    #can_create = false
    #can_edit = false
    #can_delete = false
    #deleted_at = null

    setClass(id, name, can_read, can_create, can_edit, can_delete, deleted_at) {
        this.#id = id
        this.#name = name
        this.#can_read = can_read
        this.#can_create = can_create
        this.#can_edit = can_edit
        this.#can_delete = can_delete
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get can_read() { return this.#can_read }
    set can_read(v) { this.#can_read = v }

    get can_create() { return this.#can_create }
    set can_create(v) { this.#can_create = v }

    get can_edit() { return this.#can_edit }
    set can_edit(v) { this.#can_edit = v }

    // Gates the DELETE routes, which are all soft deletes. The physical purge
    //  (service.hardDelete) is backend-only and deliberately has no flag of its own.
    get can_delete() { return this.#can_delete }
    set can_delete(v) { this.#can_delete = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = Permission
