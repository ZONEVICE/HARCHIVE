const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

module.exports = app => {
    app.get('/api/permission/',           authenticate, authorize('read',   'permission'), controller.getAll)
    app.get('/api/permission/id/:id',     authenticate, authorize('read',   'permission'), controller.getById)
    app.get('/api/permission/name/:name', authenticate, authorize('read',   'permission'), controller.getByName)
    app.post('/api/permission/',          authenticate, authorize('create', 'permission'), controller.post)
    app.put('/api/permission/update/',    authenticate, authorize('edit',   'permission'), controller.update)
    app.delete('/api/permission/id/:id',  authenticate, authorize('delete', 'permission'), controller.deleteById)
}
