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
_.getAdminUser = () => repository.LoadAdminUser()

_.create = (user) => repository.Post(user)

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
_.login = (username, password) => {
    const user = repository.LoadUserByUsername(username)
    if (user === null) return null
    if (user.password !== password) return null
    return createToken({ id: user.id })
}

// Changes the password of the user identified by the session id (taken from the JWT).
//  Returns false when that user no longer exists or the current password does not match,
//  leaving the stored one untouched. Passwords are plain text for now, so it is a direct
//  comparison.
_.changePassword = (id, old_password, new_password) => {
    const user = repository.LoadUserById(id)
    if (user === null) return false
    if (user.password !== old_password) return false
    repository.SetPassword(user.id, new_password)
    return true
}

module.exports = _
