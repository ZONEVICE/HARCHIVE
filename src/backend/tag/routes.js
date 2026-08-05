const controller = require('./controller')
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.get('/api/tag/',            authenticate, controller.getAll)
    app.get('/api/tag/id/:id',      authenticate, controller.getById)
    app.get('/api/tag/name/:name',  authenticate, controller.getByName)
    app.post('/api/tag/',           authenticate, controller.post)
    app.put('/api/tag/update/',     authenticate, controller.update)
    app.delete('/api/tag/id/:id',   authenticate, controller.deleteById)
}
