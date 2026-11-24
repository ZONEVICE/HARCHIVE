// =====================================================================================
// IMPORTS.
//
//  The guards live in the web shell, not in an entity, because they belong to every route.
//  They reach the entities they need the way anything inside the backend does: through a
//  service, and through a util.js for vocabulary — never through a repository.
// =====================================================================================

// Verifies the session token and answers null for any token that is not valid.
const { verifyToken } = require('../core/jwt')

// Reads one cookie out of the raw Cookie header, which Express does not parse.
const { readCookie } = require('../core/cookies')

// The name of the cookie a session travels in — user's vocabulary, read through its util.js.
const { SESSION_COOKIE_NAME } = require('../user/util')

// The one place that answers whether a user may perform a verb on an entity.
const permission_service = require('../permission/service')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// GUARDS.
// =====================================================================================

/**
 * Resolves the session, or stops the request.
 *
 * Reads the session cookie, verifies its token and hangs the payload — `{ id }` — on
 *  req.session for the handlers downstream, so a protected handler can trust that it is
 *  there and that it carries the id of a genuine, signed session.
 *
 * A missing cookie and an unverifiable one are rejected through the same branch and with the
 *  same answer, because verifyToken returns null for both: a forged or expired token buys
 *  nothing that sending no cookie at all would not. It runs before the handler, which is why
 *  a request without a session never reaches validation — a perfectly well-formed body is
 *  answered 401, not 400, and a DELETE stamps nothing.
 */
_.authenticate = async (req, res, next) => {
    // The token inside the session cookie, or null when the request carries none.
    const token = readCookie(req.headers.cookie, SESSION_COOKIE_NAME)

    // The payload of a genuine, unexpired token, or null for anything else.
    const session = verifyToken(token)

    // No valid session is an authoritative rejection, not a client-correctable mistake.
    if (session === null) return res.status(401).json({ status: 'failed', description: 'authentication required' })

    // The handlers downstream read the caller's id from here, never from the request.
    req.session = session

    next()
}

/**
 * Guards a route behind one of the four CRUD verbs on one entity.
 *
 * This one is a *factory*, not a middleware: it takes the verb and the entity and returns the
 *  middleware. That is why authenticate is listed without parentheses and this one with them:
 *
 *    app.post('/api/tag/', authenticate, authorize('create', 'tag'), controller.post)
 *                          ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                          already the   call it to GET the middleware, with the verb
 *                          middleware    and the entity baked into it
 *
 * The two halves run at different moments. authorize('create', 'tag') runs once, at startup,
 *  when routes.js is read; what it returns is what runs on every request, and it still
 *  remembers both arguments through the closure.
 *
 * So neither argument ever arrives from the caller: not in the body, not in the URL, not in
 *  a header. The route declares them, because a client able to name its own verb would send
 *  "read" while asking to create. The request supplies *who*, the route supplies *what*.
 *
 * The verb is spelled out per route instead of being derived from req.method, because the
 *  mapping is not always the method's: POST /api/user/login/ creates nothing. The entity is
 *  spelled out for the same kind of reason: it is a property of the route, not of its URL
 *  text.
 *
 * The flags are read from the database on every request and never carried in the session
 *  token, so a permission an administrator changes takes effect straight away instead of at
 *  the affected user's next sign-in.
 * @param {String} verb One of read, create, edit, delete.
 * @param {String} entity The entity the route touches.
 * @returns {Function} The middleware to list in a route, before its handler.
 */
_.authorize = (verb, entity) => async (req, res, next) => {
    // It always runs after authenticate, which is what puts the session on the request. A
    //  route that listed it alone would land here with nothing to ask about.
    if (req.session === undefined) return res.status(401).json({ status: 'failed', description: 'authentication required' })

    // Everything that is not an explicit yes is a 403: no permission attached, a deleted
    //  permission, a deleted link, a flag set to false, an unknown verb and an entity outside
    //  the catalogues are each their own branch inside can(), never an accident of undefined
    //  being falsy.
    if (permission_service.can(req.session.id, verb, entity) === false) {
        return res.status(403).json({ status: 'failed', description: 'permission denied' })
    }

    // Allowed: the handler runs.
    next()
}

module.exports = _
