const controller = require('./controller')
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.get('/api/permission/',           authenticate, controller.getAll)
    app.get('/api/permission/id/:id',     authenticate, controller.getById)
    app.get('/api/permission/name/:name', authenticate, controller.getByName)
    app.post('/api/permission/',          authenticate, controller.post)
    app.put('/api/permission/update/',    authenticate, controller.update)
    app.delete('/api/permission/id/:id',  authenticate, controller.deleteById)
}
