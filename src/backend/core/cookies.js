// Everything this file publishes.
const _ = {}

// =====================================================================================
// COOKIE HEADER.
// =====================================================================================

/**
 * Reads one cookie out of a request `Cookie` header.
 *
 * Express writes cookies (res.cookie) but does not read them, and the project avoids adding
 *  cookie-parser for a header this small. It arrives as `name=value; other_name=other_value`.
 * @param {String} cookie_header The raw req.headers.cookie value. Absent on a request that
 *  carries no cookie at all, which is why a non-string answers null instead of throwing.
 * @param {String} name The cookie to look for.
 * @returns {String|null} The cookie value, or null when it is not there.
 */
_.readCookie = (cookie_header, name) => {
    // A request with no cookies at all has no header to read.
    if (typeof cookie_header !== 'string') return null

    // One pair per entry, in the order the browser sent them.
    const cookies = cookie_header.split(';')

    for (const cookie of cookies) {
        // A pair with no '=' is malformed; skip it rather than reading a name as a value.
        const separator = cookie.indexOf('=')
        if (separator === -1) continue

        // The name is padded with the space that follows the semicolon.
        const cookie_name = cookie.slice(0, separator).trim()
        if (cookie_name !== name) continue

        // The value is percent-encoded by the browser, so it is decoded on the way out.
        return decodeURIComponent(cookie.slice(separator + 1).trim())
    }

    // The header was there, this cookie was not.
    return null
}

module.exports = _
