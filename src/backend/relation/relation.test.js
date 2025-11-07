const { DeleteFile } = require('../logic/io');
const { DATABASE_FILE_PATH } = require('../logic/constants')
const _db = require('../logic/db');

const Model = require('./model')
const controller_db = require('./controller_db')
const controller_logic = require('./controller_logic')
const types = require('./types')

describe('Controller DB Tests', () => {
    it('DROP and CREATE table for testing', async () => {
        await controller_db.DropTable();
        await controller_db.CreateTable();
    });
    describe('CREATE TABLE & SELECT ALL', () => {
        it('Create Table & Select All Relations', async () => {
            // Creates the table.
            await controller_db.CreateTable();
            // Checks if an empty array exists.
            const res = controller_db.SelectAllRelations();
            expect(Array.isArray(res)).toBe(true);
            expect(res.length).toBe(0);
        });
    });
    describe('INSERT & SELECT ALL', () => {
        it('Insert Relation & Select All Relations', async () => {
            // Inserts a relation.
            const relation = new Model({
                id_1: 1,
                id_2: 2,
                table_1: 'users',
                table_2: 'orders',
                relation_type: 'one-to-many'
            });
            await controller_db.InsertRelation(relation);
            // Checks if the relation is inserted.
            const res = controller_db.SelectAllRelations();
            expect(Array.isArray(res)).toBe(true);
            expect(res.length).toBe(1);
        });
    });
    describe('SELECT one by ID', () => {
        it('Select One Relation By ID', async () => {
            // Inserts one relation to select.
            //  This should be the second relation with ID 2.
            const relation = new Model({
                id_1: 1,
                id_2: 2,
                table_1: 'lorem',
                table_2: 'lorem_ipsum',
                relation_type: 'test'
            });
            await controller_db.InsertRelation(relation);
            // Selects the relation with ID 2.
            const res = await controller_db.SelectOneById(2);
            expect(res).toBeInstanceOf(Model);
            expect(res.id_1).toBe(1);
            expect(res.id_2).toBe(2);
            expect(res.table_1).toBe('lorem');
            expect(res.table_2).toBe('lorem_ipsum');
            expect(res.relation_type).toBe('test');
        });
    });
    describe('UPDATE', () => {
        it('Update Relation By ID', async () => {
            // Update the relation with ID 2.
            const updatedRelation = new Model({
                id: 2,
                id_1: 99,
                id_2: 99,
                table_1: 'updated_users',
                table_2: 'updated_orders',
                relation_type: 'many-to-one'
            });
            await controller_db.UpdateRelation(updatedRelation);
            // Selects the updated relation.
            const res = await controller_db.SelectOneById(2);
            expect(res).toBeInstanceOf(Model);
            expect(res.id_1).toBe(99);
            expect(res.id_2).toBe(99);
            expect(res.table_1).toBe('updated_users');
            expect(res.table_2).toBe('updated_orders');
            expect(res.relation_type).toBe('many-to-one');
        });
    });
    describe('DELETE', () => {
        it('Delete Relation By ID', async () => {
            // Delete the relation with ID 2.
            await controller_db.DeleteRelation(2);
            // Selects all relations to confirm deletion.
            const res = controller_db.SelectAllRelations();
            expect(Array.isArray(res)).toBe(true);
            // Should only have one relation left (the first inserted).
            expect(res.length).toBe(1);
        });
    });
});
