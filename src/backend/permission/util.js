const _ = {}

// The two roles the application ships with. They are the names of the rows that
//  service.createDefaultPermissions() seeds at startup, and they live here rather than in
//  core/constants.js because nothing outside this entity has any business knowing them: what
//  a caller may do is answered by service.can(user_id, verb), never by comparing role names.
_.ADMINISTRATOR_PERMISSION_NAME = 'administrator'
_.GUEST_PERMISSION_NAME = 'guest'

module.exports = _
