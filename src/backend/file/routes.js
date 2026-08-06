const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

module.exports = app => {
    app.get('/api/file/',          authenticate, authorize('read',   'file'), controller.getAll)
    app.get('/api/file/id/:id',    authenticate, authorize('read',   'file'), controller.getById)
    app.post('/api/file/',         authenticate, authorize('create', 'file'), controller.post)
    app.put('/api/file/update/',   authenticate, authorize('edit',   'file'), controller.update)
    app.delete('/api/file/id/:id', authenticate, authorize('delete', 'file'), controller.deleteById)
}
