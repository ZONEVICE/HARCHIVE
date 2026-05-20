const controller = require('./controller')

module.exports = app => {
    app.get('/api/metadata/',           controller.getAll)
    app.get('/api/metadata/id/:id',     controller.getById)
    app.get('/api/metadata/key/:key',   controller.getByKey)
    app.post('/api/metadata/',          controller.post)
    app.put('/api/metadata/update/',    controller.update)
    app.delete('/api/metadata/key/:key', controller.deleteByKey)
}
