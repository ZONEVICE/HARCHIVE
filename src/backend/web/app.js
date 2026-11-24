// =====================================================================================
// IMPORTS.
// =====================================================================================

// The web framework.
const express = require('express')

// Answers the cross-origin preflight a browser GUI sends from another port.
const cors = require('cors')

// The application itself. This file builds it and exports it; index.js is what listens.
const app = express()

// =====================================================================================
// MIDDLEWARES.
// =====================================================================================

// Do not advertise the stack in a response header.
app.disable('x-powered-by')

// Form bodies, flat ones only: nothing here takes a nested or complex payload.
app.use(express.urlencoded({ extended: false }))

// JSON bodies, which is what every entity of this API speaks.
app.use(express.json())

// Every origin is allowed, which is what a local GUI in development needs. Narrow it the day
//  this backend is reachable from anywhere else.
app.use(cors({}))

// =====================================================================================
// ROUTES.
//  One line per entity, each one its own route table. The health check comes first.
// =====================================================================================

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
