require("dotenv").config()

const _ = {}

_.ROOT_FOLDER = process.env.ROOT_FOLDER || null
_.PORT = process.env.PORT || 9000
_.JWT_SECRET = process.env.JWT_SECRET || 'secret'

module.exports = _
