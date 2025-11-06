const express = require('express'), app = express()
const cors = require('cors')

const path = require('path')

// -------------------------------------------------------------------------------
// Middlewares.
// -------------------------------------------------------------------------------
app.use(express.urlencoded({ extended: false }))           // No complex files understanding like images.
app.use(express.static(path.join(__dirname, 'public')))    // Public static files.
app.use(express.json())                                    // Server understands JSON.
app.use(cors({}))                                          // All sources allowed.

// ----------------
// Routes.
// ----------------
require('./api/index/routes')(app)
require('../user/routes')(app)

module.exports = app
