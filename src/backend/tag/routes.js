const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

module.exports = app => {
    app.get('/api/tag/',            authenticate, authorize('read',   'tag'), controller.getAll)
    app.get('/api/tag/id/:id',      authenticate, authorize('read',   'tag'), controller.getById)
    app.get('/api/tag/name/:name',  authenticate, authorize('read',   'tag'), controller.getByName)
    app.post('/api/tag/',           authenticate, authorize('create', 'tag'), controller.post)
    app.put('/api/tag/update/',     authenticate, authorize('edit',   'tag'), controller.update)
    app.delete('/api/tag/id/:id',   authenticate, authorize('delete', 'tag'), controller.deleteById)
}
