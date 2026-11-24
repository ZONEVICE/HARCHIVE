// =====================================================================================
// MODEL.
//
//  An account. It carries no deleted_at: no route deletes a user, so the column would be a
//  state nothing can reach. The field order is the column order of CREATE TABLE and the
//  argument order of setClass.
// =====================================================================================

class User {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    #id = null

    // The identity key: UNIQUE, NFC and lower case, written by the service. Every lookup goes
    //  through this column and no other.
    #username = ''

    // The same name as it was typed — `VICE` — kept only so the account can be shown back the
    //  way it was written. Nothing is ever resolved through it, and it is not UNIQUE.
    #username_cased = ''

    // Stored in plain text for now; bcrypt is the one dependency already decided on. NFC is
    //  applied before storing and before comparing, so the same password typed on two
    //  operating systems is one password.
    #password = ''

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored account. Null for one the database has not seen yet.
     * @param {String} username The normalised username, which is what lookups match.
     * @param {String} username_cased The username as it was typed, for showing it back.
     * @param {String} password The password.
     */
    setClass(id, username, username_cased, password) {
        this.#id = id
        this.#username = username
        this.#username_cased = username_cased
        this.#password = password
    }

    // One getter/setter pair per field, in the same order.
    get id() { return this.#id }
    set id(v) { this.#id = v }

    get username() { return this.#username }
    set username(v) { this.#username = v }

    get username_cased() { return this.#username_cased }
    set username_cased(v) { this.#username_cased = v }

    get password() { return this.#password }
    set password(v) { this.#password = v }
}
module.exports = User
