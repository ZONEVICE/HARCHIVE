// =====================================================================================
// IMPORTS.
// =====================================================================================

// The handlers of this entity.
const controller = require('./controller')

// The two guards: a session first, then the verb on the entity.
const { authenticate, authorize } = require('../web/middleware')

// =====================================================================================
// ROUTES.
//
//  Every route is guarded, reads included, for the obvious reason: this is the entity that
//  answers "what may this user do?". A session first, then the verb the method means.
// =====================================================================================

module.exports = app => {
    app.get('/api/permission/',            authenticate, authorize('read',   'permission'), controller.getAll)
    app.get('/api/permission/id/:id/',     authenticate, authorize('read',   'permission'), controller.getById)
    app.get('/api/permission/name/:name/', authenticate, authorize('read',   'permission'), controller.getByName)
    app.post('/api/permission/',           authenticate, authorize('create', 'permission'), controller.post)
    app.put('/api/permission/update/',     authenticate, authorize('edit',   'permission'), controller.update)
    app.delete('/api/permission/id/:id/',  authenticate, authorize('delete', 'permission'), controller.deleteById)
}
