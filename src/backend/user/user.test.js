const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD, SESSION_COOKIE_NAME } = require('../core/constants')
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`;

const _db = require('../core/db');
const axios = require('axios');

const user_repository = require('./repository');
const user_service = require('./service');
const user_model = require('./model');

// The admin account is seed data, so creating it belongs to the seeder entity, not to this one.
const seeder_service = require('../seeder/service');

// The admin username spelled in a case nobody would type by accident — neither .toLowerCase()
//  nor .toUpperCase() of the stored name produces it. Signing in with it must reach the same
//  account: username is UNIQUE COLLATE NOCASE, so every lookup on that column ignores case.
const ADMIN_USERNAME_MIXED_CASE = 'vIcE';

describe('User Tests', () => {
    it('The mixed-case username is the admin name, spelled differently', () => {
        // Guards the constant above: if ADMIN_USERNAME ever changes, the tests using it fail
        //  here with a clear reason instead of silently testing an unknown account.
        expect(ADMIN_USERNAME_MIXED_CASE).not.toBe(ADMIN_USERNAME);
        expect(ADMIN_USERNAME_MIXED_CASE.toUpperCase()).toBe(ADMIN_USERNAME.toUpperCase());
    });
    it('DROP and CREATE table for testing', async () => {
        await user_repository.dropTable();
        await user_repository.createTable();
    });
    describe('CREATE TABLE', () => {
        it('Should create user table', () => {
            user_repository.createTable();
            const res = _db.getSharedConnection().prepare('SELECT * FROM user').all();
            expect(Array.isArray(res)).toBe(true);
        });
    });
    describe('Create Admin User', () => {
        it('Should create an admin user', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            const user = user_repository.getAdminUser();
            expect(user).not.toBeNull();
            expect(typeof user.id).toBe('number');
            expect(user.username).toBe(ADMIN_USERNAME);
            expect(user.password).toBe('changeme');
        });
        it('Not duplicated', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            seeder_service.createAdminUser();
            const res = _db.getSharedConnection().prepare(`SELECT * FROM user WHERE username = ?`).all(ADMIN_USERNAME);
            expect(res.length).toBe(1);
        });
    });
    describe('Unique username', () => {
        it('Is taken, case-insensitively', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            expect(user_service.isUsernameTaken(ADMIN_USERNAME)).toBe(true);
            expect(user_service.isUsernameTaken(ADMIN_USERNAME.toLowerCase())).toBe(true);
            expect(user_service.isUsernameTaken('nobody-holds-this-name')).toBe(false);
        });
        it('Is not taken by the account holding it', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            const admin = user_repository.getAdminUser();
            expect(user_service.isUsernameTakenByAnother(ADMIN_USERNAME, admin.id)).toBe(false);
            expect(user_service.isUsernameTakenByAnother(ADMIN_USERNAME, admin.id + 1)).toBe(true);
        });
        it('The column refuses a second account differing only in case', () => {
            // The schema is the guard, not the service: username is UNIQUE COLLATE NOCASE, so
            //  the insert throws instead of quietly creating a second admin.
            user_repository.createTable();
            seeder_service.createAdminUser();
            const duplicate = user_service.buildForCreate({ username: ADMIN_USERNAME.toLowerCase(), password: 'x' });
            expect(() => user_service.create(duplicate)).toThrow();
        });
    });
    describe('getByUsername', () => {
        it('Should load user by username', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            const user = user_repository.getByUsername(ADMIN_USERNAME);
            expect(user).not.toBeNull();
            expect(user.username).toBe(ADMIN_USERNAME);
        });
        it('Resolves the account whatever the case', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            const user = user_repository.getByUsername(ADMIN_USERNAME_MIXED_CASE);
            expect(user).not.toBeNull();
            // The row comes back spelled as it was stored, not as it was asked for: the
            //  collation decides how the name is matched, never how it is kept.
            expect(user.username).toBe(ADMIN_USERNAME);
        });
        it('Not found', () => {
            user_repository.createTable();
            const user = user_repository.getByUsername('NOBODY');
            expect(user).toBeNull();
        });
    });
    describe('getById', () => {
        it('Should load user by id', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            const admin = user_repository.getAdminUser();
            const user = user_repository.getById(admin.id);
            expect(user).not.toBeNull();
            expect(user.id).toBe(admin.id);
            expect(user.username).toBe(ADMIN_USERNAME);
        });
        it('Not found', () => {
            user_repository.createTable();
            const user = user_repository.getById('999');
            expect(user).toBeNull();
        });
    });
    describe('setPassword', () => {
        it('Should set user password correctly', () => {
            user_repository.createTable();
            seeder_service.createAdminUser();
            const admin = user_repository.getAdminUser();
            user_repository.setPassword(admin.id, 'newpassword');
            const user = user_repository.getById(admin.id);
            expect(user.password).toBe('newpassword');
        });
    });
    describe('API /Login', () => {
        it('Login is successfull', async () => {
            const res = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME,
                password: 'newpassword'
            });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('login successful');
        });
        it('Login sends the session cookie', async () => {
            const res = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME,
                password: 'newpassword'
            });
            const cookies = res.headers['set-cookie'];
            expect(Array.isArray(cookies)).toBe(true);
            expect(cookies[0]).toContain(`${SESSION_COOKIE_NAME}=`);
            expect(cookies[0]).toContain('HttpOnly');
        });
        it('Login succeeds with the username in another case', async () => {
            // The rule this entity is built for: `vice` signs into the `ViCe` account. It is the
            //  column's COLLATE NOCASE doing it, so this test is what stops a future rewrite of
            //  the schema from taking the collation out without anybody noticing.
            const res = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME_MIXED_CASE,
                password: 'newpassword'
            });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('login successful');
        });
        it('Login still requires the exact password', async () => {
            // Only the username is case-insensitive. The password is compared in JavaScript,
            //  where no collation applies.
            const res = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME,
                password: 'NEWPASSWORD'
            }, { validateStatus: () => true });
            expect(res.status).toBe(401);
            expect(res.data.status).toBe('warning');
            expect(res.data.description).toBe('invalid credentials');
        });
        it('Login fails with invalid credentials', async () => {
            try {
                const res = await axios.post(`${URL}/api/user/login/`, {
                    username: ADMIN_USERNAME,
                    password: 'wrongpassword'
                });
            } catch (error) {
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('invalid credentials');
            }
        });
        it('Login fails with an unknown username', async () => {
            try {
                const res = await axios.post(`${URL}/api/user/login/`, {
                    username: 'NOBODY',
                    password: 'newpassword'
                });
            } catch (error) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('invalid credentials');
            }
        });
        it('Login fails when the username is missing', async () => {
            try {
                const res = await axios.post(`${URL}/api/user/login/`, {
                    password: 'newpassword'
                });
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('invalid credentials');
            }
        });
    });
    describe('API /Logout', () => {
        it('Logout removes the session cookie', async () => {
            const login = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME,
                password: 'newpassword'
            });
            const session_cookie = login.headers['set-cookie'][0].split(';')[0];

            const res = await axios.get(`${URL}/api/user/logout/`, {
                headers: { Cookie: session_cookie }
            });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('logout successful');

            // The browser drops the cookie because it comes back empty and already expired.
            const cookies = res.headers['set-cookie'];
            expect(cookies[0]).toContain(`${SESSION_COOKIE_NAME}=;`);
            expect(cookies[0]).toContain('Expires=Thu, 01 Jan 1970');
        });
        it('Logout without a session', async () => {
            const res = await axios.get(`${URL}/api/user/logout/`);
            expect(res.data.status).toBe('warning');
            expect(res.data.description).toBe('no active session');
            expect(res.headers['set-cookie']).toBeUndefined();
        });
        it('Logout ignores other cookies', async () => {
            const res = await axios.get(`${URL}/api/user/logout/`, {
                headers: { Cookie: 'another_cookie=value' }
            });
            expect(res.data.status).toBe('warning');
            expect(res.data.description).toBe('no active session');
        });
    });
    describe('API / Change Password', () => {
        // Logs in and returns the raw `name=value` session cookie for a protected request.
        const loginAndGetCookie = async (password) => {
            const login = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME,
                password
            });
            return login.headers['set-cookie'][0].split(';')[0];
        };

        it('Change password requires an active session', async () => {
            try {
                await axios.post(`${URL}/api/user/changepassword/`, {
                    old_password: 'newpassword',
                    new_password: 'finalpassword'
                });
            } catch (error) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('authentication required');
            }
        });
        it('Change password rejects a session cookie that is not a valid token', async () => {
            // The other half of the guard: `authenticate` answers the same 401 whether the
            //  cookie is missing or carries a token it cannot verify, so a forged one buys
            //  nothing. This is the only place the tampered-token branch is exercised.
            //  The response is read as data rather than caught as an exception, so the
            //  assertions run even if the endpoint ever stops rejecting it.
            const res = await axios.post(`${URL}/api/user/changepassword/`, {
                old_password: 'newpassword',
                new_password: 'finalpassword'
            }, {
                validateStatus: () => true,
                headers: { Cookie: `${SESSION_COOKIE_NAME}=not-a-real-token` }
            });
            expect(res.status).toBe(401);
            expect(res.data.status).toBe('warning');
            expect(res.data.description).toBe('authentication required');
        });

        it('Change password is successful', async () => {
            const session_cookie = await loginAndGetCookie('newpassword'); // set by the SetPassword test

            const res = await axios.post(`${URL}/api/user/changepassword/`, {
                old_password: 'newpassword',
                new_password: 'finalpassword'
            }, { headers: { Cookie: session_cookie } });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('password changed successfully');

            // Verify login with new password
            const loginRes = await axios.post(`${URL}/api/user/login/`, {
                username: ADMIN_USERNAME,
                password: 'finalpassword'
            });
            expect(loginRes.data.status).toBe('success');
            expect(loginRes.data.description).toBe('login successful');
        });
        it('Change password fails with a wrong current password', async () => {
            const session_cookie = await loginAndGetCookie('finalpassword');

            try {
                await axios.post(`${URL}/api/user/changepassword/`, {
                    old_password: 'wrongpassword',
                    new_password: 'e'
                }, { headers: { Cookie: session_cookie } });
            } catch (error) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('invalid credentials');
            }
        });
        it('Revert password to the default password', async () => {
            const session_cookie = await loginAndGetCookie('finalpassword');

            const res = await axios.post(`${URL}/api/user/changepassword/`, {
                old_password: 'finalpassword',
                new_password: ADMIN_DEFAULT_PASSWORD
            }, { headers: { Cookie: session_cookie } });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('password changed successfully');
        });
    });
});
