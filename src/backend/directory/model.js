class Directory {
    // The id is assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null
    #name = ''
    // The three dates are the Unix Epoch in seconds, like every timestamp of the project.
    //  They stay null while nothing has scanned the directory or read its filesystem dates.
    #date_scan = null
    #date_creation = null
    #date_last_modification = null
    #deleted_at = null

    setClass(id, name, date_scan, date_creation, date_last_modification, deleted_at) {
        this.#id = id
        this.#name = name
        this.#date_scan = date_scan ?? null
        this.#date_creation = date_creation ?? null
        this.#date_last_modification = date_last_modification ?? null
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get date_scan() { return this.#date_scan }
    set date_scan(v) { this.#date_scan = v }

    get date_creation() { return this.#date_creation }
    set date_creation(v) { this.#date_creation = v }

    get date_last_modification() { return this.#date_last_modification }
    set date_last_modification(v) { this.#date_last_modification = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = Directory
