// =====================================================================================
// MODEL.
//
//  One link between two records of any two entities. Two axes and they never mix: who takes
//  part is the pairs (id_1, entity_1) and (id_2, entity_2), what the link means is
//  relation_type. The field order is the column order of CREATE TABLE and the argument order
//  of setClass: id first, deleted_at last.
// =====================================================================================

class Relation {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null

    // The id of the record on the first side, inside its own table.
    #id_1 = null

    // The name of the entity that owns id_1, as the catalogues spell it.
    #entity_1 = ''

    // The id of the record on the second side, inside its own table.
    #id_2 = null

    // The name of the entity that owns id_2, as the catalogues spell it.
    #entity_2 = ''

    // What the link means: one verb of the fixed catalogue in types-of-relation.js. For a
    //  directional type it also says which side is which — the parent of a `contains` is id_1.
    #relation_type = ''

    // Optional free text saying in words what the row means. Nothing ever branches on it.
    #note = null

    // Epoch seconds when the relation was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    #deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored relation. Null for one the database has not seen.
     * @param {Number} id_1 Id of the record on the first side.
     * @param {String} entity_1 Name of the entity owning id_1.
     * @param {Number} id_2 Id of the record on the second side.
     * @param {String} entity_2 Name of the entity owning id_2.
     * @param {String} relation_type One of RELATION_TYPES.
     * @param {String} note Optional. Free text, or null.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when it is live.
     */
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

    // One getter/setter pair per field, in the same order.
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
