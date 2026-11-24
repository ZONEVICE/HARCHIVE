// =====================================================================================
// STATE.
// =====================================================================================

// Everything this file publishes.
const _ = {}

// =====================================================================================
// THE DEFAULT ROLE NAMES.
//
//  The two roles the application ships with. They name the rows the seeder creates at boot,
//  and they live here — this entity's own vocabulary, offered to whoever seeds them — rather
//  than in core/constants.js, which is for what genuinely crosses entities. What a caller may
//  do is answered by service.can(user_id, verb, entity), never by comparing a role name, so
//  nothing else in the backend reads these two.
// =====================================================================================

// Everything on every entity. The account the owner signs in with holds it.
_.ADMINISTRATOR_PERMISSION_NAME = 'administrator'

// Read on every entity, and nothing else.
_.GUEST_PERMISSION_NAME = 'guest'
module.exports = _
