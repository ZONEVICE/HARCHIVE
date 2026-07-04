const controller = require('./controller')

module.exports = app => {
    app.get('/api/metadata/',           controller.getAll)
    app.get('/api/metadata/id/:id',     controller.getById)
    app.get('/api/metadata/name/:name', controller.getByName)
    app.post('/api/metadata/',          controller.post)
    app.put('/api/metadata/update/',    controller.update)
    app.delete('/api/metadata/name/:name', controller.deleteByName)
}
