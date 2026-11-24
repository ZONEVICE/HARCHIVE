// =====================================================================================
// IMPORTS.
// =====================================================================================

// The token lifetime, which the cookie copies so it never outlives the token inside it.
const { EXPIRATION_IN_SECONDS } = require('../core/jwt')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// THE SEEDED ACCOUNT.
//
//  This entity's own vocabulary, published for the one other caller that needs it: whoever
//  seeds the database creates the account from these two, and this entity's service is what
//  processes them — the username is normalised on the way into the column like any other.
//  They live here rather than in core/constants.js, which is for what crosses entities.
// =====================================================================================

// The username of the account the application ships with, spelled the way the owner writes
//  it. Stored in two columns: normalised in `username`, exactly like this in `username_cased`.
_.ADMIN_USERNAME = 'VICE'

// The password that account is created with. Meant to be changed through the API on the
//  first sign-in; the seeder never writes it again over an account that already exists.
_.ADMIN_DEFAULT_PASSWORD = 'changeme'

// =====================================================================================
// THE SESSION COOKIE.
//
//  The schema of the cookie a session travels in. The web middleware reads the name to find
//  the cookie on an incoming request, which is the second reason this file exists: it
//  publishes vocabulary, never a way to reach this entity's rows.
// =====================================================================================

// The cookie the session token is carried in, shared by login, logout and the middleware.
_.SESSION_COOKIE_NAME = 'harchive_session'

// Not readable from JavaScript, only sent to this site, and dead when the token inside it
//  dies. `secure` stays off while the app is served over plain HTTP; turn it on behind HTTPS.
_.SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: EXPIRATION_IN_SECONDS * 1000,   // Express expects milliseconds here.
}

// The browser only drops a cookie when the attributes match the ones it was created with,
//  minus its lifetime, which res.clearCookie sets to a date in the past by itself. Keep these
//  in step with SESSION_COOKIE_OPTIONS above or the logout stops working.
_.CLEAR_SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
}

module.exports = _
