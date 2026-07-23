const { EXPIRATION_IN_SECONDS } = require('../core/jwt');

const _ = {};

// The session cookie is not readable from JavaScript, is only sent to this site, and
//  dies when the token inside it does. `secure` stays off while the app is served over
//  plain HTTP; turn it on once it runs behind HTTPS.
_.SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: EXPIRATION_IN_SECONDS * 1000, // Express expects milliseconds here.
};

// The browser only drops a cookie when the attributes match the ones it was created with,
//  minus its lifetime, which `res.clearCookie` sets to a date in the past by itself.
//  Keep these attributes in sync with SESSION_COOKIE_OPTIONS or the logout stops working.
_.CLEAR_SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
};

module.exports = _;
