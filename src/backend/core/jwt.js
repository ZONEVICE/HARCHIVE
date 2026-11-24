// =====================================================================================
// IMPORTS.
// =====================================================================================

// The library that signs and verifies the tokens.
const jsonwebtoken = require('jsonwebtoken')

// The secret every token is signed with.
const { JWT_SECRET } = require('./env')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// How long a freshly signed token stays valid, in seconds. Exported because the session
//  cookie is given the same lifetime.
_.EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 7   // Seven days.

// =====================================================================================
// TOKENS.
// =====================================================================================

/**
 * Signs a payload into a JsonWebToken.
 * @param {Object} payload What the token carries.
 * @returns {String} The signed token.
 */
_.createToken = (payload) => jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: _.EXPIRATION_IN_SECONDS })

/**
 * Verifies a token's signature and expiration and hands back what it carries.
 *
 * @param {String} token The token to verify, as it came out of the session cookie.
 * @returns {Object|null} The decoded payload, or null when the token is not valid.
 */
_.verifyToken = (token) => {
    // The library throws for every invalid token, so the catch is the "no" branch.
    try {
        return jsonwebtoken.verify(token, JWT_SECRET)
    } catch (error) {
        return null
    }
}

module.exports = _
