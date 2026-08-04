const _ = {}

// The two roles the application ships with. They name the rows the seeder entity creates at
//  startup, and they live here — offered to the seeder — rather than in core/constants.js
//  because they are this entity's own vocabulary: what a caller may do is answered by
//  service.can(user_id, verb), never by comparing role names, so nobody else needs them.
_.ADMINISTRATOR_PERMISSION_NAME = 'administrator'
_.GUEST_PERMISSION_NAME = 'guest'

module.exports = _
