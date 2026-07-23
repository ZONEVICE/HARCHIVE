const controller = require('./controller');

module.exports = app => {
    app.post('/api/user/login/',           controller.login)
    app.get('/api/user/logout/',           controller.logout)
    app.post('/api/user/change_password/', controller.changePassword)
}
