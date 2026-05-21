const controller = require('./controller')

module.exports = app => {
    app.get('/api/file/',          controller.getAll)
    app.get('/api/file/id/:id',    controller.getById)
    app.post('/api/file/',         controller.post)
    app.put('/api/file/update/',   controller.update)
    app.delete('/api/file/id/:id', controller.deleteById)
}
