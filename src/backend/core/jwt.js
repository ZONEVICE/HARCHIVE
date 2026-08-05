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
 * `jsonwebtoken.verify` throws when the token is absent, expired, malformed or has a
 * wrong signature, and every one of those is an expected condition here, not an
 * error: the try/catch turns it into a `null` the caller can simply check.
 *
 * The catch is deliberately silent, which is why it is the one place in the backend that
 * swallows an error without a `console.error`. Every anonymous request to a route behind
 * `authenticate` lands here — that is the normal way in for a visitor who has not signed in,
 * not a fault — so logging it would fill the server log with `jwt must be provided` and bury
 * the failures that do matter. The caller still learns everything it is entitled to know: the
 * token is not valid. Why it is not valid is never told apart, on purpose, so a forged token
 * and an absent one are indistinguishable from outside.
 * @param {String} token The token to verify.
 * @returns {Object|null} The decoded payload, or null when the token is not valid.
 */
_.verifyToken = token => {
    try {
        return jsonwebtoken.verify(token, JWT_SECRET)
    } catch (error) {
        return null
    }
}

module.exports = _
