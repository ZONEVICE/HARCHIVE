const _ = {}

/**
 * Reads one cookie out of a request `Cookie` header.
 * Express does not parse cookies on its own and the project avoids extra dependencies,
 * so the header is read by hand. It arrives as `name=value; other_name=other_value`.
 * @param {String} cookie_header The raw `req.headers.cookie` value.
 * @param {String} name The cookie to look for.
 * @returns {String|null} The cookie value, or null when it is not present.
 */
_.readCookie = (cookie_header, name) => {
    if (typeof cookie_header !== 'string') return null

    const cookies = cookie_header.split(';')
    for (const cookie of cookies) {
        const separator = cookie.indexOf('=')
        if (separator === -1) continue

        const cookie_name = cookie.slice(0, separator).trim()
        if (cookie_name !== name) continue

        return decodeURIComponent(cookie.slice(separator + 1).trim())
    }

    return null
}

module.exports = _
