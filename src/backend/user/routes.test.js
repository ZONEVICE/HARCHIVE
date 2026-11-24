// =====================================================================================
// IMPORTS.
// =====================================================================================

// Where the running server listens.
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`

// The HTTP client the suite drives the routes with.
const axios = require('axios')

// The service, to create the account this suite signs in with and to purge it. No route
//  creates a user.
const user_service = require('./service')

// The seeded account, and the name of the cookie a session travels in.
const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD, SESSION_COOKIE_NAME } = require('./util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run. The database is shared with the server and the other suites, so the
//  account created here carries it and nothing collides with a row left behind.
const RUN = Date.now()

// The account this suite changes the password of. The seeded admin is only ever signed in
//  with, never changed: other suites sign in with it at the same time.
const USERNAME = `Route-User-${RUN}`

// Its password, with a capital and an accent, so the exact comparison has something to catch.
const PASSWORD = 'Contraseña-1'

// The password it is changed to.
const NEW_PASSWORD = 'Contraseña-2'

// =====================================================================================
// STATE.
// =====================================================================================

// Reads every response as data, never as an exception, so each test asserts the status code.
const ANY_STATUS = { validateStatus: () => true }

// Id of the account this suite created, purged in afterAll.
let user_id = null

// =====================================================================================
// LOCAL FUNCTIONS.
// =====================================================================================

// One wrapper per route in routes.js. login and logout take the cookie they send, if any.
const userLogin = (body) => axios.post(`${URL}/api/user/login/`, body, ANY_STATUS)
const userLogout = (cookie) => axios.get(`${URL}/api/user/logout/`, { ...ANY_STATUS, headers: cookieHeader(cookie) })
const userChangePassword = (body, cookie) => axios.post(`${URL}/api/user/changepassword/`, body, { ...ANY_STATUS, headers: cookieHeader(cookie) })

// The headers a request carries: the cookie when there is one, nothing otherwise.
const cookieHeader = (cookie) => {
    if (cookie === undefined) return {}
    return { Cookie: cookie }
}

// Signs an account in and answers the raw `name=value` session cookie.
const loginCookie = async (username, password) => {
    const res = await userLogin({ username, password })
    return res.headers['set-cookie'][0].split(';')[0]
}

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// The account this suite works on, created the way the seeder creates one.
beforeAll(() => {
    const created = user_service.create(user_service.buildForCreate({ username: USERNAME, password: PASSWORD }))
    user_id = created.id
})

// Purges the account this suite created and nothing else.
afterAll(() => {
    user_service.hardDelete(user_id)
})

// =====================================================================================
// ROUTES.
// =====================================================================================

describe('POST /api/user/login/', () => {
    it('returns 200 and sends the session cookie, HttpOnly', async () => {
        const res = await userLogin({ username: ADMIN_USERNAME, password: ADMIN_DEFAULT_PASSWORD })
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('user login success')

        const cookies = res.headers['set-cookie']
        expect(cookies[0]).toContain(`${SESSION_COOKIE_NAME}=`)
        expect(cookies[0]).toContain('HttpOnly')
        expect(cookies[0]).toContain('SameSite=Lax')
    })

    it('accepts the username in any case: a username is an identity, not a secret', async () => {
        for (const username of [USERNAME.toLowerCase(), USERNAME.toUpperCase(), `  ${USERNAME}  `]) {
            const res = await userLogin({ username, password: PASSWORD })
            expect(res.status).toBe(200)
        }
    })

    it('accepts the password typed in another accent shape', async () => {
        // NFC on the way in and on sign-in, so a decomposed ñ is still the same password.
        const res = await userLogin({ username: USERNAME, password: PASSWORD.normalize('NFD') })
        expect(res.status).toBe(200)
    })

    it('answers 401 when the password differs only in case: a password is exact', async () => {
        const res = await userLogin({ username: USERNAME, password: PASSWORD.toUpperCase() })
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('user login failed')
        expect(res.headers['set-cookie']).toBeUndefined()
    })

    it('answers 401 with the same description for a username nobody holds', async () => {
        // One answer for both, so nobody can probe which usernames exist.
        const res = await userLogin({ username: `nobody-${RUN}`, password: PASSWORD })
        expect(res.status).toBe(401)
        expect(res.data.description).toBe('user login failed')
    })

    it('answers 400 when a credential is missing or not text', async () => {
        for (const body of [{ password: PASSWORD }, { username: USERNAME }, { username: 5, password: PASSWORD }]) {
            const res = await userLogin(body)
            expect(res.status).toBe(400)
            expect(res.data.status).toBe('warning')
            expect(res.data.description).toBe('user invalid')
        }
    })
})

describe('GET /api/user/logout/', () => {
    it('clears the session cookie', async () => {
        const cookie = await loginCookie(USERNAME, PASSWORD)

        const res = await userLogout(cookie)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('user logout success')
        expect(res.headers['set-cookie'][0]).toContain(`${SESSION_COOKIE_NAME}=;`)
        expect(res.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970')
    })

    it('answers a warning when there is no session to clear', async () => {
        const res = await userLogout()
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('user session not found')
        expect(res.headers['set-cookie']).toBeUndefined()
    })

    it('ignores every cookie that is not the session one', async () => {
        const res = await userLogout('theme=dark; language=es')
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('user session not found')
    })
})

describe('POST /api/user/changepassword/', () => {
    it('answers 401 without a session', async () => {
        const res = await userChangePassword({ old_password: PASSWORD, new_password: NEW_PASSWORD })
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 401 for a session cookie that is not a valid token', async () => {
        // A forged token buys nothing that sending no cookie at all would not.
        const res = await userChangePassword({ old_password: PASSWORD, new_password: NEW_PASSWORD }, `${SESSION_COOKIE_NAME}=forged.token.value`)
        expect(res.status).toBe(401)
        expect(res.data.description).toBe('authentication required')
    })

    it('answers 400 when a password is missing', async () => {
        const cookie = await loginCookie(USERNAME, PASSWORD)
        const res = await userChangePassword({ old_password: PASSWORD }, cookie)
        expect(res.status).toBe(400)
        expect(res.data.status).toBe('warning')
        expect(res.data.description).toBe('user invalid')
    })

    it('answers 401 when the current password does not match, and changes nothing', async () => {
        const cookie = await loginCookie(USERNAME, PASSWORD)
        const res = await userChangePassword({ old_password: 'wrong', new_password: NEW_PASSWORD }, cookie)
        expect(res.status).toBe(401)
        expect(res.data.status).toBe('failed')
        expect(res.data.description).toBe('user password change failed')
        expect((await userLogin({ username: USERNAME, password: PASSWORD })).status).toBe(200)
    })

    it('changes the password of the signed-in account, and only that one', async () => {
        const cookie = await loginCookie(USERNAME, PASSWORD)

        const res = await userChangePassword({ old_password: PASSWORD, new_password: NEW_PASSWORD }, cookie)
        expect(res.status).toBe(200)
        expect(res.data.status).toBe('success')
        expect(res.data.description).toBe('user password changed')

        // The new password opens the account, the old one no longer does.
        expect((await userLogin({ username: USERNAME, password: NEW_PASSWORD })).status).toBe(200)
        expect((await userLogin({ username: USERNAME, password: PASSWORD })).status).toBe(401)

        // The seeded account was never the target.
        expect((await userLogin({ username: ADMIN_USERNAME, password: ADMIN_DEFAULT_PASSWORD })).status).toBe(200)
    })

    it('answers 401 for a valid session whose account no longer exists', async () => {
        // An account purged after its token was signed: the token is genuine, the record gone.
        const ghost = user_service.create(user_service.buildForCreate({ username: `ghost-${RUN}`, password: PASSWORD }))
        const cookie = await loginCookie(`ghost-${RUN}`, PASSWORD)
        user_service.hardDelete(ghost.id)

        const res = await userChangePassword({ old_password: PASSWORD, new_password: NEW_PASSWORD }, cookie)
        expect(res.status).toBe(401)
        expect(res.data.description).toBe('user password change failed')
    })
})
