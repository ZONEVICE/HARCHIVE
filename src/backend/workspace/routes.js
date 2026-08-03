const controller = require('./controller')

module.exports = app => {
    app.get('/api/workspace/',          controller.getAll)
    app.get('/api/workspace/id/:id',    controller.getById)
    app.post('/api/workspace/',         controller.post)
    app.put('/api/workspace/update/',   controller.update)
    app.delete('/api/workspace/id/:id', controller.deleteById)
}
