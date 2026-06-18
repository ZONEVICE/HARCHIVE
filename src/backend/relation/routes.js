const controller = require('./controller')

module.exports = app => {
    app.get('/api/relation/',                 controller.getAll)
    app.get('/api/relation/entities/',        controller.getEntities)
    app.get('/api/relation/types/',           controller.getTypes)
    app.get('/api/relation/id/:id',           controller.getById)
    app.get('/api/relation/entity/:entity',   controller.getByEntity)
    app.get('/api/relation/entity_id/:id',    controller.getByEntityId)
    app.post('/api/relation/',                controller.post)
    app.put('/api/relation/update/',          controller.update)
    app.delete('/api/relation/id/:id',        controller.deleteById)
}
