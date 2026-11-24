// =====================================================================================
// STATE.
// =====================================================================================

// Everything this file publishes.
const _ = {}

// =====================================================================================
// PREDICATES.
//
//  Deliberately duplicated in every HTTP entity, so the folder stays liftable.
// =====================================================================================

// True when the value is text.
_.isString = (v) => typeof v === 'string'

// True when the value is a number. NaN is excluded: it is what Number() answers for a
//  malformed route parameter.
_.isNumber = (v) => typeof v === 'number' && Number.isNaN(v) === false

// True when the value is a real boolean, never a truthy string.
_.isBoolean = (v) => typeof v === 'boolean'

// True when the value can be an id: INTEGER PRIMARY KEY values are whole and start at 1.
_.isId = (v) => Number.isInteger(v) && v > 0

// =====================================================================================
// REQUEST VALIDATORS.
//
//  One per named action, each reading the raw req.body. No route creates or edits an account
//  yet, so there is no validatePost or validateUpdate.
// =====================================================================================

/**
 * Checks the body of a sign-in request. Nothing beyond the two fields is asked of it: the
 *  password is compared, not parsed, and a malformed one is simply a failed login.
 * @param {Object} body The raw req.body.
 * @returns {Boolean} True when the request may go through.
 */
_.validateLogin = (body) => {
    // Both credentials, as text.
    if (_.isString(body.username) === false) return false
    if (_.isString(body.password) === false) return false

    return true
}

/**
 * Checks the body of a password change. It carries no id: the account is the one in the
 *  session cookie, which the middleware has already resolved.
 * @param {Object} body The raw req.body.
 * @returns {Boolean} True when the request may go through.
 */
_.validateChangePassword = (body) => {
    // The current password and the new one, as text.
    if (_.isString(body.old_password) === false) return false
    if (_.isString(body.new_password) === false) return false

    return true
}

module.exports = _
