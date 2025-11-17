const { DeleteFile } = require('../logic/io');
const { DATABASE_FILE_PATH } = require('../logic/constants')
const _db = require('../logic/db');

const { PORT } = require('../logic/env')
const URL = `http://localhost:${PORT}`;
const axios = require('axios');

const Model = require('./model')
const controller_db = require('./controller_db')
const controller_logic = require('./controller_logic')
const types = require('./types')

// HTTP API request functions
async function PostApiRelation(data) {
    try {
        return await axios.post(`${URL}/api/relation/`, data);
    } catch (error) {
        return error.response;
    }
}

async function GetApiRelationAll() {
    try {
        return await axios.get(`${URL}/api/relation/`);
    } catch (error) {
        return error.response;
    }
}

async function GetApiRelationById(id) {
    try {
        return await axios.get(`${URL}/api/relation/${id}/`);
    } catch (error) {
        return error.response;
    }
}

async function GetApiRelationByFilter(apiGetFilter, data) {
    try {
        return await axios.post(`${URL}/api/relation/get/${apiGetFilter}/`, data);
    } catch (error) {
        return error.response;
    }
}

async function PutApiRelationById(id, data) {
    try {
        return await axios.put(`${URL}/api/relation/${id}/`, data);
    } catch (error) {
        return error.response;
    }
}

async function DeleteRelationById(id) {
    try {
        return await axios.delete(`${URL}/api/relation/${id}/`);
    } catch (error) {
        return error.response;
    }
}

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

describe('HTTP API Tests', () => {
    describe('POST - /api/relation/', () => {
        it('Create a new relation', async () => {
            // Creates a new relation via the API.
            const res = await PostApiRelation({
                id_1: 10,
                id_2: 20,
                table_1: types.GetTableWildcard(),
                table_2: types.GetTableRelation(),
                relation_type: types.GetRelationTypeWildcard(),
            });
            // Checks the response from the backend.
            expect(res.status).toBe(201);
            expect(res.data.status).toBe('success');
            expect(res.data.data).toHaveProperty('id');
            expect(res.data.data.id_1).toBe(10);
            expect(res.data.data.id_2).toBe(20);
            expect(res.data.data.table_1).toBe(types.GetTableWildcard());
            expect(res.data.data.table_2).toBe(types.GetTableRelation());
            expect(res.data.data.relation_type).toBe(types.GetRelationTypeWildcard());
        });
        it('Empty JSON send', async () => {
            const res = await PostApiRelation({});
            expect(res.status).toBe(400);
            expect(res.data.status).toBe('error');
            expect(res.data.data).toBe(null);
        });
    });
    describe('GET - /api/relation/', () => {
        it('Get all relations', async () => {
            // Creates another relation for testing at least two exist.
            const res = await PostApiRelation({
                id_1: 20,
                id_2: 30,
                table_1: types.GetTableWildcard(),
                table_2: types.GetTableRelation(),
                relation_type: types.GetRelationTypeWildcard()
            });
            expect(res.status).toBe(201);
            expect(res.data.status).toBe('success');
            expect(res.data.data).toHaveProperty('id');
            // Now gets all relations.
            const getRes = await GetApiRelationAll();
            expect(getRes.status).toBe(200);
            expect(getRes.data.status).toBe('success');
            expect(Array.isArray(getRes.data.data)).toBe(true);
            expect(getRes.data.data.length).toBeGreaterThanOrEqual(2);
        });
    });
    describe('GET - /api/relation/:id/', () => {
        it('Get relation by ID', async () => {
            // There are at least 3 relations. So, gather ID 2.
            const res = await GetApiRelationById(2);
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(res.data.data).toHaveProperty('id');
            expect(res.data.data.id).toBe(2);
        });
        it('Get relation by invalid ID', async () => {
            const res = await GetApiRelationById(9999);
            expect(res.status).toBe(404);
            expect(res.data.status).toBe('error');
            expect(res.data.data).toBe(null);
        });
    });
    describe('POST - /api/relation/get/:filter/', () => {
        it('Invalid filter', async () => {
            const res = await GetApiRelationByFilter('invalid_filter', {});
            expect(res.status).toBe(400);
            expect(res.data.status).toBe('error');
            expect(res.data.data).toBe(null);
        });
        it('Get relations by id_1', async () => {
            const res = await GetApiRelationByFilter(types.GetApiGetFilterById1(), { id_1: 10 });
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(Array.isArray(res.data.data)).toBe(true);
            expect(res.data.data.length).toBeGreaterThanOrEqual(1);
        });
        it('Get relation by id_1 and id_2', async () => {
            const res = await GetApiRelationByFilter(types.GetApiGetFilterById1AndId2(), { id_1: 10, id_2: 20 });
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(res.data.data).toHaveProperty('id');
            expect(res.data.data.id_1).toBe(10);
            expect(res.data.data.id_2).toBe(20);
        });
        it('Get relations by table_1', async () => {
            const res = await GetApiRelationByFilter(types.GetApiGetFilterByTable1(), { table_1: types.GetTableWildcard() });
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(Array.isArray(res.data.data)).toBe(true);
            expect(res.data.data.length).toBeGreaterThanOrEqual(2);
        });
        it('Get relations by table_1 and table_2', async () => {
            const res = await GetApiRelationByFilter(types.GetApiGetFilterByTable1AndTable2(), {
                table_1: types.GetTableWildcard(),
                table_2: types.GetTableRelation()
            });
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(Array.isArray(res.data.data)).toBe(true);
            expect(res.data.data.length).toBeGreaterThanOrEqual(2);
        });
        it('Get relations by relation_type', async () => {
            const res = await GetApiRelationByFilter(types.GetApiGetFilterByRelationType(), {
                relation_type: types.GetRelationTypeWildcard()
            });
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(Array.isArray(res.data.data)).toBe(true);
            expect(res.data.data.length).toBeGreaterThanOrEqual(2);
        });
    });
    describe('PUT - /api/relation/:id/', () => {
        it('Update relation by invalid ID', async () => {
            const res = await PutApiRelationById(9999, {
                id_1: 100,
                id_2: 200,
                table_1: types.GetTableUser(),
                table_2: types.GetTableItem(),
                relation_type: types.GetRelationTypeTest(),
            });
            expect(res.status).toBe(404);
            expect(res.data.status).toBe('error');
            expect(res.data.data).toBe(null);
        });
        it('Update relation by ID', async () => {
            // Create a relation to update.
            let relationId = null;
            const postRes = await PostApiRelation({
                id_1: 30,
                id_2: 40,
                table_1: types.GetTableUser(),
                table_2: types.GetTableItem(),
                relation_type: types.GetRelationTypeTest(),
            });
            expect(postRes.status).toBe(201);
            relationId = postRes.data.data.id;
            // Now, update the created relation.
            const putRes = await PutApiRelationById(relationId, {
                id_1: 300,
                id_2: 400,
                table_1: types.GetTableProfile(),
                table_2: types.GetTableSettings(),
                relation_type: types.GetRelationTypeWildcard(),
            });
            expect(putRes.status).toBe(200);
            expect(putRes.data.status).toBe('success');
            expect(putRes.data.data).toHaveProperty('id');
            expect(putRes.data.data.id).toBe(relationId);
            expect(putRes.data.data.id_1).toBe(300);
            expect(putRes.data.data.id_2).toBe(400);
            expect(putRes.data.data.table_1).toBe(types.GetTableProfile());
            expect(putRes.data.data.table_2).toBe(types.GetTableSettings());
            expect(putRes.data.data.relation_type).toBe(types.GetRelationTypeWildcard());
            // Finally, get the updated relation to confirm changes.
            const getRes = await GetApiRelationById(relationId);
            expect(getRes.status).toBe(200);
            expect(getRes.data.status).toBe('success');
            expect(getRes.data.data.id_1).toBe(300);
            expect(getRes.data.data.id_2).toBe(400);
            expect(getRes.data.data.table_1).toBe(types.GetTableProfile());
            expect(getRes.data.data.table_2).toBe(types.GetTableSettings());
            expect(getRes.data.data.relation_type).toBe(types.GetRelationTypeWildcard());
        });
    });
    describe('DELETE - /api/relation/:id/', () => {
        it('Delete relation by ID - Invalid ID', async () => {
            const res = await DeleteRelationById(9999);
            expect(res.status).toBe(200);
            expect(res.data.status).toBe('success');
            expect(res.data.description).toContain('deleted');
            expect(res.data.data).toBe(null);
        });
        it('Delete relation by ID - Valid ID', async () => {
            // First, create a new relation to delete.
            const postRes = await PostApiRelation({
                id_1: 50,
                id_2: 60,
                table_1: types.GetTableUser(),
                table_2: types.GetTableItem(),
                relation_type: types.GetRelationTypeTest(),
            });
            expect(postRes.status).toBe(201);
            const relationId = postRes.data.data.id;
            // Now, delete the created relation.
            const deleteRes = await DeleteRelationById(relationId);
            expect(deleteRes.status).toBe(200);
            expect(deleteRes.data.status).toBe('success');
            // Finally, attempt to get the deleted relation to confirm deletion.
            const getRes = await GetApiRelationById(relationId);
            expect(getRes.status).toBe(404);
            expect(getRes.data.status).toBe('error');
        });
    });
});
