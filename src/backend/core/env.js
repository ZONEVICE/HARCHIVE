// =====================================================================================
// IMPORTS.
// =====================================================================================

// Reads .env into process.env. The file is gitignored and optional: every key below has a
//  working default, so a fresh clone boots with no .env at all.
require('dotenv').config()

const _ = {}

// =====================================================================================
// ENVIRONMENT KEYS.
//
//  Keep this list and .env.template in step: the template names every key read here, with
//  the values left empty.
// =====================================================================================

// The port the web server listens on.
_.PORT = readKey('PORT', 9000)

// The secret every session token is signed with.
_.JWT_SECRET = readKey('JWT_SECRET', 'secret')

// =====================================================================================
// STARTUP WARNINGS.
// =====================================================================================

// The default secret is public — it is written in this file and in .env.template — so anybody
//  can sign a session cookie with it and walk past the authenticate middleware as any user.
//  That is fine while the backend only listens on localhost during development, which is why
//  this warns instead of refusing to boot: a fresh clone has to run without ceremony. Turn it
//  into a refusal the day this backend is reachable from anywhere else.
if (_.JWT_SECRET === 'secret') {
    console.warn('Warning: JWT_SECRET is the default value. Set it in .env before exposing this backend.')
}

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

/**
 * Reads one key of the environment, falling back to its default.
 * @param {String} name Name of the key, as it is written in .env.
 * @param {String|Number} fallback The value used when the key is missing.
 * @returns {String|Number} The value from the environment, or the fallback.
 */
function readKey(name, fallback) {
    // Note: a key copied from .env.template and left empty arrives as '', which means "not set"
    //  exactly like a key that is not there at all.
    const value = process.env[name]
    if (value === undefined || value === '') return fallback

    return value
}

module.exports = _
