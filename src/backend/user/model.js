// =====================================================================================
// MODEL.
//
//  An account. It carries no deleted_at: no route deletes a user, so the column would be a
//  state nothing can reach. The field order is the column order of CREATE TABLE and the
//  argument order of setClass.
// =====================================================================================

class User {
    // Assigned by the database (INTEGER PRIMARY KEY) on insert, so it starts null.
    id = null

    // The identity key: UNIQUE, NFC and lower case, written by the service. Every lookup goes
    //  through this column and no other.
    username = ''

    // The same name as it was typed — `VICE` — kept only so the account can be shown back the
    //  way it was written. Nothing is ever resolved through it, and it is not UNIQUE.
    username_cased = ''

    // Stored in plain text for now; bcrypt is the one dependency already decided on. NFC is
    //  applied before storing and before comparing, so the same password typed on two
    //  operating systems is one password.
    password = ''

    /**
     * Fills every field at once, in column order.
     * @param {Number} id Id of the stored account. Null for one the database has not seen yet.
     * @param {String} username The normalised username, which is what lookups match.
     * @param {String} username_cased The username as it was typed, for showing it back.
     * @param {String} password The password.
     */
    setClass(id, username, username_cased, password) {
        this.id = id
        this.username = username
        this.username_cased = username_cased
        this.password = password
    }

    // One get/set pair per field, in the same order.
    getId() { return this.id }
    setId(v) { this.id = v }

    getUsername() { return this.username }
    setUsername(v) { this.username = v }

    getUsernameCased() { return this.username_cased }
    setUsernameCased(v) { this.username_cased = v }

    getPassword() { return this.password }
    setPassword(v) { this.password = v }
}

// =====================================================================================
// EXPORT.
// =====================================================================================

module.exports = User
