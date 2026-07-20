const { generateUUIDv4 } = require('../core/id')

class Relation {
    #id = generateUUIDv4()
    #id_1 = ""
    #entity_1 = ""
    #id_2 = ""
    #entity_2 = ""
    #relation_type = ""
    #note = null
    #deleted_at = null

    constructor() {}

    setClass(id, id_1, entity_1, id_2, entity_2, relation_type, note, deleted_at) {
        this.#id = id
        this.#id_1 = id_1
        this.#entity_1 = entity_1
        this.#id_2 = id_2
        this.#entity_2 = entity_2
        this.#relation_type = relation_type
        this.#note = note ?? null
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get id_1() { return this.#id_1 }
    set id_1(v) { this.#id_1 = v }

    get entity_1() { return this.#entity_1 }
    set entity_1(v) { this.#entity_1 = v }

    get id_2() { return this.#id_2 }
    set id_2(v) { this.#id_2 = v }

    get entity_2() { return this.#entity_2 }
    set entity_2(v) { this.#entity_2 = v }

    get relation_type() { return this.#relation_type }
    set relation_type(v) { this.#relation_type = v }

    get note() { return this.#note }
    set note(v) { this.#note = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = Relation
