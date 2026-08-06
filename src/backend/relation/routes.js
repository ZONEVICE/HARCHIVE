const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

// The six GET routes stay public: what contains what, and what is tagged with what, is the
//  archive's structure, and the GUI draws it before anyone signs in. Only the writes are guarded.
module.exports = app => {
    app.get('/api/relation/',                 controller.getAll)
    app.get('/api/relation/entities/',        controller.getEntities)
    app.get('/api/relation/types/',           controller.getTypes)
    app.get('/api/relation/id/:id',           controller.getById)
    app.get('/api/relation/entity/:entity',   controller.getByEntity)
    app.get('/api/relation/entity_id/:id',    controller.getByEntityId)
    app.post('/api/relation/',                authenticate, authorize('create', 'relation'), controller.post)
    app.put('/api/relation/update/',          authenticate, authorize('edit',   'relation'), controller.update)
    app.delete('/api/relation/id/:id',        authenticate, authorize('delete', 'relation'), controller.deleteById)
}
