require("dotenv").config()

const _ = {}

// Every key has a default, so the application boots with no .env file at all. See .env.template.
_.PORT = process.env.PORT || 9000
_.JWT_SECRET = process.env.JWT_SECRET || 'secret'

// The default secret is public — it is written in this file and in .env.template — so anybody
//  can sign a session cookie with it and walk past the authenticate middleware as any user.
//  That is fine while the backend only listens on localhost during development, which is why
//  this warns instead of refusing to boot: a fresh clone has to run without ceremony. Set
//  JWT_SECRET in .env before the app is reachable from anywhere else.
if (_.JWT_SECRET === 'secret') {
    console.warn('Warning: JWT_SECRET is the default value. Set it in .env before exposing this backend.')
}

module.exports = _
