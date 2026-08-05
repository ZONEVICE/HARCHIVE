const controller = require('./controller')
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.get('/api/file/',          authenticate, controller.getAll)
    app.get('/api/file/id/:id',    authenticate, controller.getById)
    app.post('/api/file/',         authenticate, controller.post)
    app.put('/api/file/update/',   authenticate, controller.update)
    app.delete('/api/file/id/:id', authenticate, controller.deleteById)
}
