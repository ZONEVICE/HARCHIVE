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
//  the tag entity.
// =====================================================================================

module.exports = app => {
    app.get('/api/tag/',            authenticate, authorize('read',   'tag'), controller.getAll)
    app.get('/api/tag/id/:id/',     authenticate, authorize('read',   'tag'), controller.getById)
    app.get('/api/tag/name/:name/', authenticate, authorize('read',   'tag'), controller.getByName)
    app.post('/api/tag/',           authenticate, authorize('create', 'tag'), controller.post)
    app.put('/api/tag/update/',     authenticate, authorize('edit',   'tag'), controller.update)
    app.delete('/api/tag/id/:id/',  authenticate, authorize('delete', 'tag'), controller.deleteById)
}
