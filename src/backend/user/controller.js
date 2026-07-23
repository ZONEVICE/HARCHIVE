const service = require('./service');
const validators = require('./validators');
const { SESSION_COOKIE_NAME } = require('../core/constants');
const { readCookie } = require('../core/cookies');
const { SESSION_COOKIE_OPTIONS, CLEAR_SESSION_COOKIE_OPTIONS } = require('./util');

const _ = {};

/**
 * User login handler.
 * On success it sends the session token back as a cookie.
 * @param {String} req.body.username User name.
 * @param {String} req.body.password User password.
 */
_.login = async (req, res) => {
    try {
        if (!validators.validateLogin(req.body)) return res.status(400).json({ status: 'warning', description: 'invalid credentials' });

        const { username, password } = req.body;
        const token = service.login(username, password);

        if (token === null) return res.status(401).json({ status: 'warning', description: 'invalid credentials' });

        res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
        return res.json({ status: 'success', description: 'login successful' });
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ status: 'failed', description: 'login failed' });
    }
}

/**
 * User logout handler.
 * Removes the session cookie from the client browser. The cookie is only checked for
 * presence, never verified: an expired or tampered token still has to be cleared.
 */
_.logout = async (req, res) => {
    try {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE_NAME);

        if (token === null) return res.json({ status: 'warning', description: 'no active session' });

        res.clearCookie(SESSION_COOKIE_NAME, CLEAR_SESSION_COOKIE_OPTIONS);
        return res.json({ status: 'success', description: 'logout successful' });
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ status: 'failed', description: 'logout failed' });
    }
}

/**
 * Change password for the default user.
 * @param {String} req.body.old_password Current password.
 * @param {String} req.body.new_password New password.
 */
_.changePassword = async (req, res) => {
    const { old_password, new_password } = req.body;

    if (service.changePassword(old_password, new_password)) {
        res.json({ status: 'success', description: 'password changed successfully' });
    } else {
        res.status(401).json({ status: 'warning', description: 'invalid credentials' });
    }
}

module.exports = _;
