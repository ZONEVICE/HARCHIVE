const controller = require('./controller')

module.exports = app => {
    app.get('/api/tag/',            controller.getAll)
    app.get('/api/tag/id/:id',      controller.getById)
    app.get('/api/tag/name/:name',  controller.getByName)
    app.post('/api/tag/',           controller.post)
    app.put('/api/tag/update/',     controller.update)
    app.delete('/api/tag/id/:id',   controller.deleteById)
}
