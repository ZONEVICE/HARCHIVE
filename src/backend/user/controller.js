// =====================================================================================
// IMPORTS.
//
//  The validators and the service, plus this entity's own util.js for the cookie schema and
//  core/cookies to read it back. Never a repository, never another entity's internals.
// =====================================================================================

// The request predicates and validators of this entity.
const validators = require('./validators')

// The only way this file reaches the data.
const service = require('./service')

// The schema of the cookie a session travels in.
const { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, CLEAR_SESSION_COOKIE_OPTIONS } = require('./util')

// Reads one cookie out of the raw Cookie header, which Express does not parse.
const { readCookie } = require('../core/cookies')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// ROUTE CONTROLLERS.
// =====================================================================================

/**
 * Signs a user in and sends the session token back as a cookie.
 * @param {String} req.body.username The username, in any casing.
 * @param {String} req.body.password The password, compared exactly.
 */
_.login = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateLogin(req.body) === false) return res.status(400).json({ status: 'warning', description: 'user invalid' })

        // One answer for "no such account" and for "wrong password", so nobody can probe
        //  which usernames exist. Bad credentials are an authoritative rejection.
        const token = service.login(req.body.username, req.body.password)
        if (token === null) return res.status(401).json({ status: 'failed', description: 'user login failed' })

        // The token travels in an HttpOnly cookie, so no script of the page can read it.
        res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
        return res.status(200).json({ status: 'success', description: 'user login success' })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'user login error' })
    }
}

// Signs a user out by clearing the session cookie. The cookie is only checked for presence
//  and never verified: an expired or tampered token still has to be cleared from the browser.
_.logout = async (req, res) => {
    try {
        // Nothing to clear is a controlled condition, not a failure.
        const token = readCookie(req.headers.cookie, SESSION_COOKIE_NAME)
        if (token === null) return res.status(200).json({ status: 'warning', description: 'user session not found' })

        // The browser drops the cookie when the attributes match the ones it was set with.
        res.clearCookie(SESSION_COOKIE_NAME, CLEAR_SESSION_COOKIE_OPTIONS)
        return res.status(200).json({ status: 'success', description: 'user logout success' })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'user logout error' })
    }
}

/**
 * Changes the password of the signed-in account.
 *
 * The authenticate middleware guards this route, so req.session.id is the account to change:
 *  it comes out of the signed cookie and never out of the body, which is what makes this the
 *  one protected route that needs no authorize — the only record it can reach is the
 *  caller's own.
 * @param {String} req.body.old_password The current password.
 * @param {String} req.body.new_password The password to store.
 */
_.changePassword = async (req, res) => {
    try {
        // A body that fails validation never reaches the service.
        if (validators.validateChangePassword(req.body) === false) {
            return res.status(400).json({ status: 'warning', description: 'user invalid' })
        }

        // False means the account is gone or the current password does not match. Both are
        //  authoritative rejections, so they answer 401 and not a 400.
        const changed = service.changePassword(req.session.id, req.body.old_password, req.body.new_password)
        if (changed === false) return res.status(401).json({ status: 'failed', description: 'user password change failed' })

        return res.status(200).json({ status: 'success', description: 'user password changed' })
    } catch (error) {
        console.error('Error:', error.message)
        return res.status(500).json({ status: 'failed', description: 'user password change error' })
    }
}

module.exports = _
