const controller = require('./controller')
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.get('/api/workspace/',          authenticate, controller.getAll)
    app.get('/api/workspace/id/:id',    authenticate, controller.getById)
    app.post('/api/workspace/',         authenticate, controller.post)
    app.put('/api/workspace/update/',   authenticate, controller.update)
    app.delete('/api/workspace/id/:id', authenticate, controller.deleteById)
}
