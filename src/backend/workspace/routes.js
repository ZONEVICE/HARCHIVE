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
//  Every route of this entity is guarded: a session first, then the verb the method means on
//  the workspace entity.
// =====================================================================================

module.exports = app => {
    app.get('/api/workspace/',           authenticate, authorize('read',   'workspace'), controller.getAll)
    app.get('/api/workspace/id/:id/',    authenticate, authorize('read',   'workspace'), controller.getById)
    app.post('/api/workspace/',          authenticate, authorize('create', 'workspace'), controller.post)
    app.put('/api/workspace/update/',    authenticate, authorize('edit',   'workspace'), controller.update)
    app.delete('/api/workspace/id/:id/', authenticate, authorize('delete', 'workspace'), controller.deleteById)
}
