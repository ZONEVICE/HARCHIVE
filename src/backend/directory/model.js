// =====================================================================================
// MODEL.
//
//  A directory of the archive. The hierarchy is not a column here: what a directory contains
//  and what sits next to it are relation records. The field order is the column order of
//  CREATE TABLE and the argument order of setClass: id first, deleted_at last.
// =====================================================================================

class Directory {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    id = null

    // The directory name. Not UNIQUE and not an identity key: two directories under different
    //  parents may share a name, so it is stored exactly as it arrived.
    name = ''

    // When the directory was last scanned, in epoch seconds. Null until something scans it.
    date_scan = null

    // The filesystem creation date, in epoch seconds. Null until something reads it.
    date_creation = null

    // The filesystem modification date, in epoch seconds. Null until something reads it.
    date_last_modification = null

    // Epoch seconds when the directory was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored directory. Null for one the database has not seen.
     * @param {String} name The directory name.
     * @param {Number} date_scan Optional. Epoch seconds of the last scan, or null.
     * @param {Number} date_creation Optional. Epoch seconds of the creation, or null.
     * @param {Number} date_last_modification Optional. Epoch seconds of the change, or null.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when it is live.
     */
    setClass(id, name, date_scan, date_creation, date_last_modification, deleted_at) {
        this.id = id
        this.name = name
        this.date_scan = date_scan ?? null
        this.date_creation = date_creation ?? null
        this.date_last_modification = date_last_modification ?? null
        this.deleted_at = deleted_at ?? null
    }

    // One get/set pair per field, in the same order.
    getId() { return this.id }
    setId(v) { this.id = v }

    getName() { return this.name }
    setName(v) { this.name = v }

    getDateScan() { return this.date_scan }
    setDateScan(v) { this.date_scan = v }

    getDateCreation() { return this.date_creation }
    setDateCreation(v) { this.date_creation = v }

    getDateLastModification() { return this.date_last_modification }
    setDateLastModification(v) { this.date_last_modification = v }

    getDeletedAt() { return this.deleted_at }
    setDeletedAt(v) { this.deleted_at = v }
}

// =====================================================================================
// EXPORT.
// =====================================================================================

module.exports = Directory
