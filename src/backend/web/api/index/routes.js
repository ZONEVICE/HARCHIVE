// =====================================================================================
// IMPORTS.
// =====================================================================================

// The handler of the health check.
const controller = require('./controller')

// =====================================================================================
// ROUTES.
//  The health check, public: it is what says the server is listening at all.
// =====================================================================================

module.exports = app => {
    app.get('/api/ping/', controller.ping)
}
