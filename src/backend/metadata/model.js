const { generateUUIDv4 } = require('../core/id')

class Metadata {
    #id = generateUUIDv4()
    #name = ''
    #value = ''
    #deleted_at = null

    constructor() {}

    setClass(id, name, value, deleted_at) {
        this.#id = id
        this.#name = name
        this.#value = value
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get value() { return this.#value }
    set value(v) { this.#value = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = Metadata
