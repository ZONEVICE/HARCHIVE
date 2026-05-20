class Metadata {
    #id = 0
    #key = ''
    #value = ''

    constructor() {}

    setClass(id, key, value) {
        this.#id = id
        this.#key = key
        this.#value = value
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get key() { return this.#key }
    set key(v) { this.#key = v }

    get value() { return this.#value }
    set value(v) { this.#value = v }
}

module.exports = Metadata
