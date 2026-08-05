const controller = require('./controller')
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.get('/api/metadata/',               controller.getAll)
    app.get('/api/metadata/id/:id',         controller.getById)
    app.get('/api/metadata/name/:name',     controller.getByName)
    app.post('/api/metadata/',              authenticate, controller.post)
    app.put('/api/metadata/update/',        authenticate, controller.update)
    app.delete('/api/metadata/name/:name',  authenticate, controller.deleteByName)
}
