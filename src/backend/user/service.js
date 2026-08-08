const User = require('./model')
const repository = require('./repository')
const { createToken } = require('../core/jwt')

const _ = {}

// --------------------------------------------------------------------------------
// Data access. This service is the only door to repository.js: nothing outside the
//  entity reaches the repository itself, it always comes through here.
// --------------------------------------------------------------------------------

// The seeded admin account, or null when it is missing. The seeder entity reads it to know
//  whether the account still has to be created, and again to grant it the administrator
//  permission.
_.getAdminUser = () => repository.getAdminUser()

_.getById = (id) => repository.getById(id)
_.getByUsername = (username) => repository.getByUsername(username)
_.create = (user) => repository.post(user)

// Builds a User from a create request. The id is assigned by the database. No HTTP route
//  creates a user yet — the caller today is the seeder entity, which creates the admin account
//  at startup — but the shape is the same one every other entity uses, so wiring a POST later
//  changes nothing here.
_.buildForCreate = (body) => {
    const user = new User()
    user.username = body.username
    user.password = body.password
    return user
}

// Passwords are stored in plain text for now, so verification is a direct comparison.
//  Returns null when the username does not exist or when the password does not match,
//  the same answer in both cases so nobody can probe which usernames are registered.
//  On success it returns a signed session token carrying the user id.
//  The username is matched case-insensitively — `vice` signs into the `ViCe` account — and
//  nothing here spells that out because nothing here has to: the rule lives in the column's
//  COLLATE NOCASE, so the lookup below already carries it. The password is *not* covered by
//  any of this and is compared exactly, in JavaScript.
_.login = (username, password) => {
    const user = repository.getByUsername(username)
    if (user === null) return null
    if (user.password !== password) return null
    return createToken({ id: user.id })
}

// Usernames are UNIQUE and case-insensitive, the same rule tag and permission apply to their
//  names. No route creates a user yet, so the only caller today is the seeder — but the guard
//  belongs here, next to the column it protects, so a future POST /api/user/ branches on it and
//  answers 409 instead of letting the UNIQUE constraint throw a 500.
_.isUsernameTaken = (username) => repository.getByUsername(username) !== null

// Same rule, but ignoring the account being updated so it can keep its own username.
_.isUsernameTakenByAnother = (username, id) => {
    const clash = repository.getByUsername(username)
    if (!clash) return false
    return clash.id !== id
}

// Changes the password of the user identified by the session id (taken from the JWT).
//  Returns false when that user no longer exists or the current password does not match,
//  leaving the stored one untouched. Passwords are plain text for now, so it is a direct
//  comparison.
_.changePassword = (id, old_password, new_password) => {
    const user = repository.getById(id)
    if (user === null) return false
    if (user.password !== old_password) return false
    repository.setPassword(user.id, new_password)
    return true
}

module.exports = _
