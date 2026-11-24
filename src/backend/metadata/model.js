// =====================================================================================
// MODEL.
//
//  A key/value record the frontend configures itself from. The field order is the column
//  order of CREATE TABLE and the argument order of setClass: id first, deleted_at last,
//  everywhere. Nothing here validates, reads the database or knows about HTTP.
// =====================================================================================

class Metadata {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null

    // The identity key: UNIQUE, and normalised by the service before it ever reaches SQL.
    #name = ''

    // Whatever the client sent, stored byte for byte. It is not an identity key, so nothing
    //  folds its case or touches its accents.
    #value = ''

    // Epoch seconds when the record was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    #deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored record. Null for one the database has not seen yet.
     * @param {String} name The normalised name.
     * @param {String} value The value as the client sent it.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when the record is live.
     */
    setClass(id, name, value, deleted_at) {
        this.#id = id
        this.#name = name
        this.#value = value
        this.#deleted_at = deleted_at ?? null
    }

    // One getter/setter pair per field, in the same order.
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
