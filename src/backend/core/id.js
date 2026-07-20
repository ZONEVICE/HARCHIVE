const { randomUUID } = require('crypto')

const generateUUIDv4 = () => randomUUID()

module.exports = { generateUUIDv4 }
