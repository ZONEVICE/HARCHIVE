const { DeleteFile } = require('../logic/io');
const { DATABASE_FILE_PATH } = require('../logic/constants')
const _db = require('../logic/db');

const settings_controller = require('./controller');
const settings_model = require('./model');

// https://jestjs.io/docs/expect

describe('Settings Controller', () => {
    it('Remove and create database file for testing', () => {
        DeleteFile(DATABASE_FILE_PATH);
        _db.CreateDatabaseFile();
    });
    describe('CreateTable', () => {
        it('should create the settings table if it does not exist', () => {
            settings_controller.CreateTable();
            const __db = _db.GetConnection();
            const res = __db.prepare('SELECT * FROM SETTINGS').all();
            __db.close();
            expect(Array.isArray(res)).toBe(true);
        });
    });
    describe('CreateDefaultRecord', () => {
        it('should create a default record if no records exist', () => {
            settings_controller.CreateDefaultRecord();
            const __db = _db.GetConnection();
            const res = __db.prepare('SELECT * FROM SETTINGS').all();
            __db.close();
            expect(Array.isArray(res)).toBe(true);
            expect(res.length).toBe(1);
        });
    });
    describe('LoadData', () => {
        it('Load data correctly', () => {
            const settings_data = settings_controller.LoadData();
            expect(typeof settings_data).toBe('object');
            expect(settings_data).not.toHaveProperty('id');
            expect(settings_data).toHaveProperty('allow_downloads');
            expect(settings_data).toHaveProperty('allow_file_system_browser');
            expect(settings_data).toHaveProperty('register_logs');
        });
    });
    describe('SaveData', () => {
        it('should save data correctly', () => {
            // First load existing settings.
            const settings_updated = new settings_model({
                allow_downloads: 0,
                allow_file_system_browser: 0,
                register_logs: 0,
            });
            const res = settings_controller.SaveData(settings_updated);
            expect(res).toBe(true);
            // Load data again to verify changes.
            const settings_data = settings_controller.LoadData();
            expect(settings_data.allow_downloads).toBe(0);
            expect(settings_data.allow_file_system_browser).toBe(0);
            expect(settings_data.register_logs).toBe(0);
        });
    });
});
