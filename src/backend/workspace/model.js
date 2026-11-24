// =====================================================================================
// MODEL.
//
//  A workspace: one directory of the real filesystem the application is allowed to work in.
//  It is not a role and grants no rights — that is what permission is for. The field order is
//  the column order of CREATE TABLE and the argument order of setClass.
// =====================================================================================

class WorkSpace {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null

    // What the owner calls this workspace. Free text, not UNIQUE.
    #name = ''

    // The identity key: the absolute directory on disk, UNIQUE, so two workspaces cannot
    //  point at the same place. Normalised by the service, case included — see the note there.
    #path_absolute = ''

    // The path as the client wants it shown. Nothing derives it from path_absolute today.
    #path_relative = ''

    // Epoch seconds when the workspace was deleted, or null while it is live. Only the
    //  deleted-record primitives write it, so a model built for a write leaves it alone.
    #deleted_at = null

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored workspace. Null for one the database has not seen.
     * @param {String} name What the workspace is called.
     * @param {String} path_absolute The absolute directory, normalised.
     * @param {String} path_relative The relative path, as the client sent it.
     * @param {Number} deleted_at Epoch seconds of the deletion, or null when it is live.
     */
    setClass(id, name, path_absolute, path_relative, deleted_at) {
        this.#id = id
        this.#name = name
        this.#path_absolute = path_absolute
        this.#path_relative = path_relative
        this.#deleted_at = deleted_at ?? null
    }

    // One getter/setter pair per field, in the same order.
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
