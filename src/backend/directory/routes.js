const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

module.exports = app => {
    app.get('/api/directory/',          authenticate, authorize('read',   'directory'), controller.getAll)
    app.get('/api/directory/id/:id',    authenticate, authorize('read',   'directory'), controller.getById)
    app.post('/api/directory/',         authenticate, authorize('create', 'directory'), controller.post)
    app.put('/api/directory/update/',   authenticate, authorize('edit',   'directory'), controller.update)
    app.delete('/api/directory/id/:id', authenticate, authorize('delete', 'directory'), controller.deleteById)
}
