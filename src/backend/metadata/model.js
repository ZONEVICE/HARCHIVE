const { generateId } = require('../core/id')

class Metadata {
    #id = generateId()
    #name = ''
    #value = ''

    constructor() {}

    setClass(id, name, value) {
        this.#id = id
        this.#name = name
        this.#value = value
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get value() { return this.#value }
    set value(v) { this.#value = v }
}

module.exports = Metadata
