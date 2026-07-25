const controller = require('./controller');
const { authenticate } = require('../web/middleware');

module.exports = app => {
    app.post('/api/user/login/', controller.login)
    app.get('/api/user/logout/', controller.logout)
    app.post('/api/user/change_password/', authenticate, controller.changePassword)
}
