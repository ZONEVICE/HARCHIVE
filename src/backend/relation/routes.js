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
//  Note: the six GET routes are public on purpose. What contains what, and what is tagged
//  with what, is the structure of the archive, and the GUI draws it before anyone signs in.
//  Only the writes are guarded — and they are an authorization surface, because a `linked`
//  relation from a user to a permission *is* a grant.
// =====================================================================================

module.exports = app => {
    app.get('/api/relation/',                controller.getAll)
    app.get('/api/relation/entities/',       controller.getEntities)
    app.get('/api/relation/types/',          controller.getTypes)
    app.get('/api/relation/id/:id/',         controller.getById)
    app.get('/api/relation/entity/:entity/', controller.getByEntity)
    app.get('/api/relation/entity_id/:id/',  controller.getByEntityId)
    app.post('/api/relation/',               authenticate, authorize('create', 'relation'), controller.post)
    app.put('/api/relation/update/',         authenticate, authorize('edit',   'relation'), controller.update)
    app.delete('/api/relation/id/:id/',      authenticate, authorize('delete', 'relation'), controller.deleteById)
}
