const { DeleteFile } = require('../logic/io');
const { DATABASE_FILE_PATH } = require('../logic/constants');
const { PORT } = require('../logic/env');
const _db = require('../logic/db');
const URL = `http://localhost:${PORT}`;

const axios = require('axios');

const settings_controller_db = require('./controller_db');
const settings_model = require('./model');

describe('Settings Tests', () => {
    it('DROP and CREATE table for testing', async () => {
        await settings_controller_db.DropTable();
        await settings_controller_db.CreateTable();
    });
    describe('CreateTable', () => {
        it('Should create the settings table if it does not exist', () => {
            settings_controller_db.CreateTable();
            const __db = _db.GetConnection();
            const res = __db.prepare('SELECT * FROM SETTINGS').all();
            __db.close();
            expect(Array.isArray(res)).toBe(true);
        });
    });
    describe('CreateDefaultRecord', () => {
        it('Should create a default record if no records exist', () => {
            settings_controller_db.CreateDefaultRecord();
            const __db = _db.GetConnection();
            const res = __db.prepare('SELECT * FROM SETTINGS').all();
            __db.close();
            expect(Array.isArray(res)).toBe(true);
            expect(res.length).toBe(1);
        });
    });
    describe('LoadData', () => {
        it('Load data correctly', () => {
            const settings_data = settings_controller_db.LoadData();
            expect(typeof settings_data).toBe('object');
            expect(settings_data).not.toHaveProperty('id');
            expect(settings_data).toHaveProperty('allow_downloads');
            expect(settings_data).toHaveProperty('allow_file_system_browser');
            expect(settings_data).toHaveProperty('register_logs');
        });
    });
    describe('SaveData', () => {
        it('Should save data correctly', () => {
            // First load existing settings.
            const settings_updated = new settings_model({
                allow_downloads: 0,
                allow_file_system_browser: 0,
                register_logs: 0,
            });
            const res = settings_controller_db.SaveData(settings_updated);
            expect(res).toBe(true);
            // Load data again to verify changes.
            const settings_data = settings_controller_db.LoadData();
            expect(settings_data.allow_downloads).toBe(0);
            expect(settings_data.allow_file_system_browser).toBe(0);
            expect(settings_data.register_logs).toBe(0);
        });
    });
    describe('API GET > /api/settings/', () => {
        it('Returns settings successfully', async () => {
            const res = await axios.get(`${URL}/api/settings/`);
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('settings retrieved');
            expect(typeof res.data.data).toBe('object');
            expect(res.data.data).toHaveProperty('allow_downloads');
            expect(res.data.data).toHaveProperty('allow_file_system_browser');
            expect(res.data.data).toHaveProperty('register_logs');
        });
    });
    describe('API PUT > /api/settings/', () => {
        it('Saves settings successfully', async () => {
            const res = await axios.put(`${URL}/api/settings/`, {
                allow_downloads: 1,
                allow_file_system_browser: 1,
                register_logs: 1,
            });
            expect(res.data.status).toBe('success');
            expect(res.data.description).toBe('settings saved');
        });
        it('API / PUT /api/settings/ > Fails when a field is missing', async () => {
            try {
                await axios.put(`${URL}/api/settings/`, {
                    allow_file_system_browser: 1,
                    register_logs: 1,
                });
            } catch (error) {
                expect(error.response.data.status).toBe('failed');
                expect(error.response.data.description).toBe('allow_downloads is required');
            }
        });
        it('API / PUT /api/settings/ > Fails when a field has the wrong type', async () => {
            try {
                await axios.put(`${URL}/api/settings/`, {
                    allow_downloads: 'yes',
                    allow_file_system_browser: 1,
                    register_logs: 1,
                });
            } catch (error) {
                expect(error.response.data.status).toBe('failed');
                expect(error.response.data.description).toBe('allow_downloads must be a number');
            }
        });
    });
});
