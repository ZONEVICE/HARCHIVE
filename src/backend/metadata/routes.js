const controller = require('./controller')
const { authenticate, authorize } = require('../web/middleware');

// The three GET routes stay public because the GUI needs it for not registed users.
module.exports = app => {
    app.get('/api/metadata/',               controller.getAll)
    app.get('/api/metadata/id/:id',         controller.getById)
    app.get('/api/metadata/name/:name',     controller.getByName)
    app.post('/api/metadata/',              authenticate, authorize('create', 'metadata'), controller.post)
    app.put('/api/metadata/update/',        authenticate, authorize('edit',   'metadata'), controller.update)
    app.delete('/api/metadata/name/:name',  authenticate, authorize('delete', 'metadata'), controller.deleteByName)
}
