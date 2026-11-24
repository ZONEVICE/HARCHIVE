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
//  Note: the three GET routes are public on purpose. Metadata is what the GUI configures
//  itself from, so it has to be readable before anyone signs in. Every write still names the
//  verb it needs.
// =====================================================================================

module.exports = app => {
    app.get('/api/metadata/',               controller.getAll)
    app.get('/api/metadata/id/:id/',        controller.getById)
    app.get('/api/metadata/name/:name/',    controller.getByName)
    app.post('/api/metadata/',              authenticate, authorize('create', 'metadata'), controller.post)
    app.put('/api/metadata/update/',        authenticate, authorize('edit',   'metadata'), controller.update)
    app.delete('/api/metadata/name/:name/', authenticate, authorize('delete', 'metadata'), controller.deleteByName)
}
