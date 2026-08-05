const controller = require('./controller')
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.get('/api/directory/',          authenticate, controller.getAll)
    app.get('/api/directory/id/:id',    authenticate, controller.getById)
    app.post('/api/directory/',         authenticate, controller.post)
    app.put('/api/directory/update/',   authenticate, controller.update)
    app.delete('/api/directory/id/:id', authenticate, controller.deleteById)
}
