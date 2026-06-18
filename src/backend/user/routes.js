const controller = require('./controller');

module.exports = app => {
    app.post('/api/user/login/',           controller.login)
    app.post('/api/user/change_password/', controller.changePassword)
}
