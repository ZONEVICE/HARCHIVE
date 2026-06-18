const { ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD } = require('../core/constants')
const { PORT } = require('../core/env')
const URL = `http://localhost:${PORT}`;

const _db = require('../core/db');
const axios = require('axios');

const user_repository = require('./repository');
const user_model = require('./model');

describe('User Tests', () => {
    it('DROP and CREATE table for testing', async () => {
        await user_repository.DropTable();
        await user_repository.CreateTable();
    });
    describe('CREATE TABLE', () => {
        it('Should create USER table', () => {
            user_repository.CreateTable();
            const __db = _db.GetConnection();
            const res = __db.prepare('SELECT * FROM USER').all();
            __db.close();
            expect(Array.isArray(res)).toBe(true);
        });
    });
    describe('Create Admin User', () => {
        it('Should create an admin user', () => {
            user_repository.CreateTable();
            user_repository.CreateAdminUser();
            const user = user_repository.LoadUserById('1');
            expect(user).not.toBeNull();
            expect(user.username).toBe(ADMIN_USERNAME);
            expect(user.password).toBe('changeme');
        });
        it('Not duplicated', () => {
            user_repository.CreateTable();
            user_repository.CreateAdminUser();
            user_repository.CreateAdminUser();
            const dbConn = _db.GetConnection();
            const res = dbConn.prepare(`SELECT * FROM USER WHERE username = '${ADMIN_USERNAME}'`).all();
            dbConn.close();
            expect(res.length).toBe(1);
        });
    });
    describe('LoadUserById', () => {
        it('Should load user by id', () => {
            user_repository.CreateTable();
            user_repository.CreateAdminUser();
            const user = user_repository.LoadUserById('1');
            expect(user).not.toBeNull();
            expect(user.id).toBe('1');
            expect(user.username).toBe(ADMIN_USERNAME);
        });
        it('Not found', () => {
            user_repository.CreateTable();
            const user = user_repository.LoadUserById('999');
            expect(user).toBeNull();
        });
    });
    describe('SetPassword', () => {
        it('Should set user password correctly', () => {
            user_repository.CreateTable();
            user_repository.CreateAdminUser();
            user_repository.SetPassword('1', 'newpassword');
            const user = user_repository.LoadUserById('1');
            expect(user.password).toBe('newpassword');
        });
    });
    describe('API /Login', () => {
        it('Login is successfull', async () => {
            const res = await axios.post(`${URL}/api/user/login/`, {
                password: 'newpassword'
            });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('login successful');
        });
        it('Login fails with invalid credentials', async () => {
            try {
                const res = await axios.post(`${URL}/api/user/login/`, {
                    password: 'wrongpassword'
                });
            } catch (error) {
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('invalid credentials');
            }
        });
    });
    describe('API / Change Password', () => {
        it('Change password is successful', async () => {
            const res = await axios.post(`${URL}/api/user/change_password/`, {
                old_password: 'newpassword', // in previous test we set it to 'newpassword'
                new_password: 'finalpassword'
            });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('password changed successfully');

            // Verify login with new password
            const loginRes = await axios.post(`${URL}/api/user/login/`, {
                password: 'finalpassword'
            });
            expect(loginRes.data.status).toBe('success');
            expect(loginRes.data.description).toBe('login successful');
        });
        it('API / Change password fails with invalid credentials', async () => {
            try {
                const res = await axios.post(`${URL}/api/user/change_password/`, {
                    old_password: 'wrongpassword',
                    new_password: 'e'
                });
            } catch (error) {
                expect(error.response.data.status).toBe('warning');
                expect(error.response.data.description).toBe('invalid credentials');
            }
        });
         it('API / Additional > Revert password to default password', async () => {
            try {
                const res = await axios.post(`${URL}/api/user/change_password/`, {
                    old_password: 'finalpassword',
                    new_password: ADMIN_DEFAULT_PASSWORD
                });
            } catch (error) {
                expect(error.response.data.status).toBe('success');
                expect(error.response.data.description).toBe('password changed successfully');
            }
        });
    });
});
