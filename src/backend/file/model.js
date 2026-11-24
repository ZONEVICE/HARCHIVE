// =====================================================================================
// MODEL.
//
//  A file of the archive. Where it sits and what it is tagged with are never columns here:
//  both are relation records. The field order is the column order of CREATE TABLE and the
//  argument order of setClass: id first, deleted_at last.
// =====================================================================================

class File {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null

    // The file name. Not UNIQUE and not an identity key: two directories may hold the same
    //  name, so it is stored exactly as it arrived, capitals and accents included.
    #name = ''

    // The SHA-256 of the contents, as text. It is the datum itself, so nothing touches it.
    #hash_256_sha = ''

    // Where the file sits, relative to the workspace it belongs to.
    #relative_path = ''

    // The extension, stored apart so a search never has to parse the name.
    #extension = ''

    // Epoch seconds when the file was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    #deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored file. Null for one the database has not seen yet.
     * @param {String} name The file name.
     * @param {String} hash_256_sha The SHA-256 of the contents.
     * @param {String} relative_path The path inside its workspace.
     * @param {String} extension The extension.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when the file is live.
     */
    setClass(id, name, hash_256_sha, relative_path, extension, deleted_at) {
        this.#id = id
        this.#name = name
        this.#hash_256_sha = hash_256_sha
        this.#relative_path = relative_path
        this.#extension = extension
        this.#deleted_at = deleted_at ?? null
    }

    // One getter/setter pair per field, in the same order.
    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get hash_256_sha() { return this.#hash_256_sha }
    set hash_256_sha(v) { this.#hash_256_sha = v }

    get relative_path() { return this.#relative_path }
    set relative_path(v) { this.#relative_path = v }

    get extension() { return this.#extension }
    set extension(v) { this.#extension = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}
module.exports = File
