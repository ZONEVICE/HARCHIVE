class WorkSpace {
    #id = null
    #name = ''
    #path_absolute = ''
    #path_relative = ''
    #deleted_at = null

    setClass(id, name, path_absolute, path_relative, deleted_at) {
        this.#id = id
        this.#name = name
        this.#path_absolute = path_absolute
        this.#path_relative = path_relative
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get path_absolute() { return this.#path_absolute }
    set path_absolute(v) { this.#path_absolute = v }

    get path_relative() { return this.#path_relative }
    set path_relative(v) { this.#path_relative = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = WorkSpace
