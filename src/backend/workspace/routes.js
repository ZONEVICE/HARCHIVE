const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

module.exports = app => {
    app.get('/api/workspace/',          authenticate, authorize('read',   'workspace'), controller.getAll)
    app.get('/api/workspace/id/:id',    authenticate, authorize('read',   'workspace'), controller.getById)
    app.post('/api/workspace/',         authenticate, authorize('create', 'workspace'), controller.post)
    app.put('/api/workspace/update/',   authenticate, authorize('edit',   'workspace'), controller.update)
    app.delete('/api/workspace/id/:id', authenticate, authorize('delete', 'workspace'), controller.deleteById)
}
