const controller = require('./controller')

module.exports = app => {
    app.get('/api/ping/', controller.Ping)
}
