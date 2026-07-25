const { verifyToken } = require('../core/jwt');
const { readCookie } = require('../core/cookies');
const { SESSION_COOKIE_NAME } = require('../core/constants');

const _ = {};

/**
 * Authentication middleware: guards protected routes.
 * Reads the session cookie, decodes its JsonWebToken and, when the token is valid, hangs
 * the resulting payload (e.g. `{ id }`) on `req.session` for the handlers downstream.
 * A missing, expired or tampered token is rejected here, so a protected handler can trust
 * that `req.session` exists and carries the id of a genuine, signed session.
 */
_.authenticate = async (req, res, next) => {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE_NAME);
    const session = verifyToken(token);

    if (session === null) return res.status(401).json({ status: 'warning', description: 'authentication required' });

    req.session = session;

    next();
}

module.exports = _;
