// =====================================================================================
// MODEL.
//
//  A tag: a name plus a JSON blob of its own. What a tag is attached to is never a column
//  here — that is a relation record. The field order is the column order of CREATE TABLE and
//  the argument order of setClass: id first, deleted_at last.
// =====================================================================================

class Tag {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    id = null

    // The identity key: UNIQUE, and normalised by the service before it ever reaches SQL.
    name = ''

    // The tag's own JSON blob, stored as the text the client sent. Unrelated to the metadata
    //  entity, which is a different thing with the same word.
    metadata = '{}'

    // Epoch seconds when the tag was deleted, or null while it is live. Only the deleted-record
    //  primitives write it, so a model built for a write leaves it alone.
    deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored tag. Null for one the database has not seen yet.
     * @param {String} name The normalised name.
     * @param {String} metadata The JSON blob, as text.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when the tag is live.
     */
    setClass(id, name, metadata, deleted_at) {
        this.id = id
        this.name = name
        this.metadata = metadata
        this.deleted_at = deleted_at ?? null
    }

    // One get/set pair per field, in the same order.
    getId() { return this.id }
    setId(v) { this.id = v }

    getName() { return this.name }
    setName(v) { this.name = v }

    getMetadata() { return this.metadata }
    setMetadata(v) { this.metadata = v }

    getDeletedAt() { return this.deleted_at }
    setDeletedAt(v) { this.deleted_at = v }
}

// =====================================================================================
// EXPORT.
// =====================================================================================

module.exports = Tag
