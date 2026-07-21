const User = require('./model')
const repository = require('./repository')
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')

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

// Passwords are stored in plain text for now, so verification is a direct comparison.
_.verifyPassword = (password) => repository.LoadAdminUser().password === password

// Returns false when the current password does not match, leaving the stored one untouched.
_.changePassword = (old_password, new_password) => {
    const admin_user = repository.LoadAdminUser()
    if (admin_user.password !== old_password) return false
    repository.SetPassword(admin_user.id, new_password)
    return true
}

module.exports = _
