require("dotenv").config()

const _ = {}

_.ROOT_FOLDER = process.env.ROOT_FOLDER || null
_.PORT = process.env.PORT || 9000

module.exports = _
