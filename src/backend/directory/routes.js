const controller = require('./controller')

module.exports = app => {
    app.get('/api/directory/',          controller.getAll)
    app.get('/api/directory/id/:id',    controller.getById)
    app.post('/api/directory/',         controller.post)
    app.put('/api/directory/update/',   controller.update)
    app.delete('/api/directory/id/:id', controller.deleteById)
}
