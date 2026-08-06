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
 * (`read`, `create`, `edit`, `delete`) **on one entity**.
 *
 * This one is a *factory*, not a middleware: it takes the verb and the entity and returns the
 * middleware. That is why `authenticate` is listed without parentheses and this one with them:
 *
 *   app.post('/api/tag/', authenticate, authorize('create', 'tag'), controller.post)
 *                         ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                         already the   call it to GET the middleware,
 *                         middleware    with the verb and entity baked into it
 *
 * The two halves run at different moments. `authorize('create', 'tag')` runs once, at startup,
 * when routes.js is read; what it returns — the `(req, res, next)` below — is what runs on every
 * request, and it still remembers both arguments through the closure.
 *
 * So neither `verb` nor `entity` ever arrives from the caller: not in the body, not in the URL,
 * not in a header. The route declares them. That is the whole point — a client able to name its
 * own verb would send "read" while asking to create, and hand itself the right. The request
 * supplies *who* (the session cookie), the route supplies *what*.
 *
 * It always runs after `authenticate`, which is what puts the session on the request.
 *
 * The verb is spelled out per route instead of being derived from `req.method`, because the
 * mapping would be wrong here: `POST /api/user/login/` creates nothing, and DELETE is a soft
 * delete whose undo is a `PUT deleted_at: false`, so deleting and restoring fall under two
 * different flags (`can_delete` and `can_edit`). The entity is spelled out for the same kind of
 * reason: it is a property of the route, not of the URL text, and parsing it out of the path
 * would break the moment a route is mounted somewhere else.
 *
 * The flags are read from the database on every request, never carried in the session token:
 * a permission changed by an administrator has to take effect straight away, not at the next
 * login of the affected user.
 *
 * Everything that is not an explicit yes is a 403: a route reaching this guard without a
 * session, a user with no permission attached, a permission in the trash, a link in the trash,
 * a flag set to false, an unknown verb and an entity outside SYSTEM_ENTITIES all end here.
 * `permission_service.can` owns which of the user's permissions answers — the scoped one first,
 * the global one otherwise.
 */
_.authorize = (verb, entity) => async (req, res, next) => {
    if (!req.session) return res.status(401).json({ status: 'warning', description: 'authentication required' });

    if (!permission_service.can(req.session.id, verb, entity)) {
        return res.status(403).json({ status: 'warning', description: 'permission denied' });
    }

    next();
}

module.exports = _;
