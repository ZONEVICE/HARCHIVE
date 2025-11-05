const { DeleteFile } = require('../logic/io');
const { DATABASE_FILE_PATH, ADMIN_USERNAME } = require('../logic/constants')
const { PORT } = require('../logic/env')
const URL = `http://localhost:${PORT}`;

const _db = require('../logic/db');
const axios = require('axios');

const user_controller_db = require('./controller_db');
const user_model = require('./model');

describe('User Tests', () => {
    it('Remove and create database file for testing', async () => {
        await DeleteFile(DATABASE_FILE_PATH);
        await _db.CreateDatabaseFile();
    });
    describe('CREATE TABLE', () => {
        it('Should create USER table', () => {
            user_controller_db.CreateTable();
            const __db = _db.GetConnection();
            const res = __db.prepare('SELECT * FROM USER').all();
            __db.close();
            expect(Array.isArray(res)).toBe(true);
        });
    });
    describe('Create Admin User', () => {
        it('Should create an admin user', () => {
            user_controller_db.CreateTable();
            user_controller_db.CreateAdminUser();
            const user = user_controller_db.LoadUserById('1');
            expect(user).not.toBeNull();
            expect(user.username).toBe(ADMIN_USERNAME);
            expect(user.password).toBe('changeme');
        });
        it('Not duplicated', () => {
            user_controller_db.CreateTable();
            user_controller_db.CreateAdminUser();
            user_controller_db.CreateAdminUser();
            const dbConn = _db.GetConnection();
            const res = dbConn.prepare(`SELECT * FROM USER WHERE username = '${ADMIN_USERNAME}'`).all();
            dbConn.close();
            expect(res.length).toBe(1);
        });
    });
    describe('LoadUserById', () => {
        it('Should load user by id', () => {
            user_controller_db.CreateTable();
            user_controller_db.CreateAdminUser();
            const user = user_controller_db.LoadUserById('1');
            expect(user).not.toBeNull();
            expect(user.id).toBe('1');
            expect(user.username).toBe(ADMIN_USERNAME);
        });
        it('Not found', () => {
            user_controller_db.CreateTable();
            const user = user_controller_db.LoadUserById('999');
            expect(user).toBeNull();
        });
    });
    describe('SetPassword', () => {
        it('Should set user password correctly', () => {
            user_controller_db.CreateTable();
            user_controller_db.CreateAdminUser();
            user_controller_db.SetPassword('1', 'newpassword');
            const user = user_controller_db.LoadUserById('1');
            expect(user.password).toBe('newpassword');
        });
    });
    describe('Login', () => {
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
});
