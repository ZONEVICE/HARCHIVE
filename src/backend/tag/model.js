class Tag {
    // The id is assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null
    #name = ''
    #metadata = '{}'
    #deleted_at = null

    setClass(id, name, metadata, deleted_at) {
        this.#id = id
        this.#name = name
        this.#metadata = metadata
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get metadata() { return this.#metadata }
    set metadata(v) { this.#metadata = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = Tag
