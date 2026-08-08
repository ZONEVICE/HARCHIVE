const express = require('express'), app = express()
const cors = require('cors')

// -------------------------------------------------------------------------------
// Middlewares.
// -------------------------------------------------------------------------------
app.disable('x-powered-by')                                // Do not advertise the stack.
app.use(express.urlencoded({ extended: false }))           // No complex files understanding like images.
app.use(express.json())                                    // Server understands JSON.
app.use(cors({}))                                          // All sources allowed.

// -------------------------------------------------------------------------------
// Routes.
// -------------------------------------------------------------------------------
require('./api/index/routes')(app)
require('../user/routes')(app)
require('../relation/routes')(app)
require('../metadata/routes')(app)
require('../file/routes')(app)
require('../tag/routes')(app)
require('../directory/routes')(app)
require('../permission/routes')(app)
require('../workspace/routes')(app)

module.exports = app
