const User = require('./model')
const repository = require('./repository')
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')
const { createToken } = require('../core/jwt')

const _ = {}

// Seed data: the project has a single admin user, created at startup when it is missing.
//  Calling it again on an existing database does nothing.
_.createAdminUser = () => {
    if (repository.LoadAdminUser() !== null) return
    const user = new User()
    user.username = ADMIN_USERNAME
    user.password = ADMIN_DEFAULT_PASSWORD
    repository.Post(user)
}

// The seeded admin account, or null when it is missing. Public because other entities need to
//  reach it through this surface instead of the repository: permission/service.linkAdminUser
//  grants it the administrator permission at startup.
_.getAdminUser = () => repository.LoadAdminUser()

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
