// =====================================================================================
// IMPORTS.
// =====================================================================================

// The handlers of this entity.
const controller = require('./controller')

// The session guard. No route here lists authorize — see below.
const { authenticate } = require('../web/middleware')

// =====================================================================================
// ROUTES.
//
//  Note: `changepassword` is the one protected route in the project that deliberately carries
//  no `authorize`. It changes the password of req.session.id and nothing else, so the only
//  record it can touch is the caller's own: a user must always be able to change their own
//  password, and gating it behind can_edit on `user` would let an administrator lock somebody
//  out of their own account. `login` and `logout` need no guard at all — there is no session
//  yet to check when they are called. `logout` is a state-changing GET, a known item left for
//  the security session.
// =====================================================================================

module.exports = app => {
    app.post('/api/user/login/',          controller.login)
    app.get('/api/user/logout/',          controller.logout)
    app.post('/api/user/changepassword/', authenticate, controller.changePassword)
}
