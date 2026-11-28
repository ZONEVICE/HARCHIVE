// =====================================================================================
// IMPORTS.
// =====================================================================================

// The class a write is built with.
const User = require('./model')

// The only door to the user table.
const repository = require('./repository')

// The name of the seeded account, this entity's own vocabulary.
const { ADMIN_USERNAME } = require('./util')

// Signs the session token a successful login hands back.
const { createToken } = require('../core/jwt')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// DATA ACCESS.
//
//  This service is the only door to repository.js: nothing outside the entity reaches the
//  repository itself. Every primitive there is exposed here, used or not, and answers plain
//  rows exactly as the repository gave them. Every lookup by username normalises it first.
//
//  Note: a row carries the password. No route answers an account today; the day one does, it
//  shapes the row here first, so the password never travels.
// =====================================================================================

// Every account.
_.getAll = () => repository.getAll()

// One account by id, or null.
_.getById = (id) => repository.getById(id)

// One account by username, or null. Any casing resolves the same account.
_.getByUsername = (username) => repository.getByUsername(_.normalizeUsername(username))

// The seeded admin account, or null when it is missing. A shortcut over the lookup above, read
//  by the seeder to know whether it has to create the account and to grant it its rights.
_.getAdminUser = () => _.getByUsername(ADMIN_USERNAME)

// Stores a new account and hands back the stored row, id included.
_.create = (user) => repository.post(user)

// Writes a password over the stored one, normalising it like every password. Exposed because
//  the service mirrors its repository; the business operation is changePassword below.
_.setPassword = (id, new_password) => repository.setPassword(id, _.normalizePassword(new_password))

// Removes an account for good. No route reaches it: the suites purge the accounts they
//  create through it.
_.hardDelete = (id) => repository.deleteById(id)

// =====================================================================================
// NORMALISATION.
// =====================================================================================

/**
 * The one shape a username is ever stored or compared in.
 *
 * NFC composes the accents, so a name typed on another operating system cannot arrive as a
 *  different byte string that displays identically and matches nothing. The lower case is
 *  what makes signing in case-insensitive and what stops two accounts from differing only in
 *  capitals. It belongs here and not in a COLLATE NOCASE because SQLite folds ASCII only.
 *
 * A username is an identity, not a secret: nobody should have to remember how they
 *  capitalised it. The spelling they typed is not lost, it is kept in username_cased.
 * @param {String} username The username as it arrived.
 * @returns {String} The username as the column holds it.
 */
_.normalizeUsername = (username) => username.normalize('NFC').trim().toLowerCase()

/**
 * The one shape a password is ever stored or compared in.
 *
 * Only NFC, and never a case fold: in a password the casing is information. The composition
 *  is what stops the same password typed on two operating systems from producing two
 *  different byte strings — a failure that reads as "wrong password" and that nobody thinks
 *  to debug. It is applied on the way in *and* on sign-in, since normalising one path only
 *  would lock out everyone who typed an accent.
 * @param {String} password The password as it arrived.
 * @returns {String} The password as it is stored and compared.
 */
_.normalizePassword = (password) => password.normalize('NFC')

// =====================================================================================
// MODEL CONSTRUCTION.
// =====================================================================================

/**
 * Builds a User out of a create request body.
 *
 * No route creates a user yet — the callers today are the seeder and the suites — but the
 *  shape is the one every other entity uses, so wiring a POST later changes nothing here.
 * @param {String} body.username The username, in any casing.
 * @param {String} body.password The password, compared exactly once composed.
 * @returns {Object} The model to hand to create(). Its id is left to the database.
 */
_.buildForCreate = (body) => {
    // Both username columns come from the same input: the normalised key, and the spelling as
    //  it was typed, composed and trimmed but never folded.
    const user = new User()
    user.setUsername(_.normalizeUsername(body.username))
    user.setUsernameCased(body.username.normalize('NFC').trim())

    // Plain text until bcrypt lands, composed like every password.
    user.setPassword(_.normalizePassword(body.password))

    return user
}

// =====================================================================================
// UNIQUENESS GUARDS.
//
//  No route creates or renames an account yet, so nothing branches on these two today. They
//  live next to the column they protect, so that the day such a route is written it answers
//  409 instead of letting the UNIQUE constraint throw a 500. There is no deleted-record guard:
//  this entity has no deleted_at.
// =====================================================================================

// True when an account holds the username.
_.isUsernameTaken = (username) => _.getByUsername(username) !== null

/**
 * The same rule, ignoring the account being updated so it can keep its own username.
 * @param {String} username The username to check.
 * @param {Number} id Id of the account being updated.
 * @returns {Boolean} True when another account already holds the name.
 */
_.isUsernameTakenByAnother = (username, id) => {
    // Nobody holds it: free.
    const clash = _.getByUsername(username)
    if (clash === null) return false

    // Held by the account itself: still free for it.
    return clash.id !== id
}

// =====================================================================================
// SESSION.
// =====================================================================================

/**
 * Signs a user in.
 *
 * Passwords are stored in plain text for now, so verifying one is a comparison — in
 *  JavaScript, where no collation reaches, which is what keeps the password exactly
 *  case-sensitive while the username is not.
 * @param {String} username The username, in any casing.
 * @param {String} password The password, compared exactly once composed.
 * @returns {String|null} A signed session token carrying the user id, or null when the
 *  account does not exist or the password does not match — the same answer in both cases, so
 *  nobody can probe which usernames are registered.
 */
_.login = (username, password) => {
    // No such account.
    const user = _.getByUsername(username)
    if (user === null) return null

    // Wrong password, compared in the same shape it was stored in.
    if (user.password !== _.normalizePassword(password)) return null

    // The token carries the id and nothing else: it is signed, not encrypted.
    return createToken({ id: user.id })
}

/**
 * Changes the password of one account.
 * @param {Number} id Id of the account, taken from the session token and never from a body.
 * @param {String} old_password The current password, which has to match.
 * @param {String} new_password The password to store.
 * @returns {Boolean} True when it was changed. False when that account is gone or the
 *  current password does not match, leaving the stored one untouched.
 */
_.changePassword = (id, old_password, new_password) => {
    // The account may have been purged after the token was signed.
    const user = _.getById(id)
    if (user === null) return false

    // The current password has to match before anything is written.
    if (user.password !== _.normalizePassword(old_password)) return false

    // Composed and stored.
    _.setPassword(user.id, new_password)
    return true
}

module.exports = _
