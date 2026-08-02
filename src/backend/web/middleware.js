const { verifyToken } = require('../core/jwt');
const { readCookie } = require('../core/cookies');
const { SESSION_COOKIE_NAME } = require('../core/constants');
const permission_service = require('../permission/service');

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

/**
 * Authorization middleware: guards a route behind one of the four CRUD verbs
 * (`read`, `create`, `edit`, `delete`).
 *
 * This one is a *factory*, not a middleware: it takes a verb and returns the middleware. That
 * is why `authenticate` is listed without parentheses and this one with them:
 *
 *   app.post('/api/tag/', authenticate, authorize('create'), controller.post)
 *                         ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
 *                         already the   call it to GET the middleware,
 *                         middleware    with the verb baked into it
 *
 * The two halves run at different moments. `authorize('create')` runs once, at startup, when
 * routes.js is read; what it returns — the `(req, res, next)` below — is what runs on every
 * request, and it still remembers `verb` through the closure.
 *
 * So `verb` never arrives from the caller: not in the body, not in the URL, not in a header.
 * The route declares it. That is the whole point — a client able to name its own verb would
 * send "read" while asking to create, and hand itself the right. The request supplies *who*
 * (the session cookie), the route supplies *what*.
 *
 * It always runs after `authenticate`, which is what puts the session on the request.
 *
 * The verb is spelled out per route instead of being derived from `req.method`, because the
 * mapping would be wrong here: `POST /api/user/login/` creates nothing, and DELETE is a soft
 * delete whose undo is a `PUT deleted_at: false`, so deleting and restoring fall under two
 * different flags (`can_delete` and `can_edit`).
 *
 * The flags are read from the database on every request, never carried in the session token:
 * a permission changed by an administrator has to take effect straight away, not at the next
 * login of the affected user.
 *
 * The permission is global, not per entity — it answers "may this user create?", not "may this
 * user create a tag?". Everything that is not an explicit yes is a 403: a route reaching this
 * guard without a session, a user with no permission attached, a permission in the trash and a
 * flag set to false all end here.
 */
_.authorize = (verb) => async (req, res, next) => {
    if (!req.session) return res.status(401).json({ status: 'warning', description: 'authentication required' });

    if (!permission_service.can(req.session.id, verb)) {
        return res.status(403).json({ status: 'warning', description: 'permission denied' });
    }

    next();
}

module.exports = _;
