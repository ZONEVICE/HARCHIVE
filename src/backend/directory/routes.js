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
//  the directory entity.
// =====================================================================================

module.exports = app => {
    app.get('/api/directory/',           authenticate, authorize('read',   'directory'), controller.getAll)
    app.get('/api/directory/id/:id/',    authenticate, authorize('read',   'directory'), controller.getById)
    app.post('/api/directory/',          authenticate, authorize('create', 'directory'), controller.post)
    app.put('/api/directory/update/',    authenticate, authorize('edit',   'directory'), controller.update)
    app.delete('/api/directory/id/:id/', authenticate, authorize('delete', 'directory'), controller.deleteById)
}
