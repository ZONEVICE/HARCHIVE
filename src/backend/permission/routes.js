const controller = require('./controller')

module.exports = app => {
    app.get('/api/permission/',           controller.getAll)
    app.get('/api/permission/id/:id',     controller.getById)
    app.get('/api/permission/name/:name', controller.getByName)
    app.post('/api/permission/',          controller.post)
    app.put('/api/permission/update/',    controller.update)
    app.delete('/api/permission/id/:id',  controller.deleteById)
}
