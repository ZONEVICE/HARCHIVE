const jsonwebtoken = require('jsonwebtoken')
const { JWT_SECRET } = require('./env')

const _ = {}

// How long a freshly signed token stays valid, in seconds (7 days).
//  Exported so the session cookie can expire at the same time as the token.
_.EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 7

/**
 * Signs a payload into a JsonWebToken using JWT_SECRET.
 * @param {Object} payload Data to store inside the token (never a password).
 * @returns {String} The signed token.
 */
_.createToken = payload => {
    return jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: _.EXPIRATION_IN_SECONDS })
}

/**
 * Verifies a token signature and expiration.
 * `jsonwebtoken.verify` throws when the token is expired, malformed or has a
 * wrong signature, and an expired token is an expected condition here, not an
 * error: the try/catch turns it into a `null` the caller can simply check.
 * @param {String} token The token to verify.
 * @returns {Object|null} The decoded payload, or null when the token is not valid.
 */
_.verifyToken = token => {
    try {
        return jsonwebtoken.verify(token, JWT_SECRET)
    } catch (error) {
        console.error('Error:', error.message)
        return null
    }
}

module.exports = _
