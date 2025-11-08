const _ = {}

const Model = require('./model')
const controller_db = require('./controller_db')
const types = require('./types')
const validations = require('./validations')

/**
 * Create a relation between two tables.
 * @param {number} id_1 
 * @param {number} id_2 
 * @param {string} table_1 
 * @param {string} table_2 
 * @param {string} relation_type 
 * @returns {{status: string, description: string, data: object}} Result object containing status, description, and stored data.
 */
_.CreateRelation = (id_1, id_2, table_1, table_2, relation_type) => {
    // Validations.
    const validation = validations.ValidateCreateRelation(id_1, id_2, table_1, table_2, relation_type);
    if (validation.status === 'failed') {
        return { status: validation.status, description: validation.description, data: null };
    }

    // Create relation object.
    const relation = new Model({
        id_1,
        id_2,
        table_1,
        table_2,
        relation_type,
    });

    // Save into the database.
    const res = controller_db.InsertRelation(relation);

    // Returning result.
    if (res === false)
        return { status: 'failed', description: 'failed to create relation in the database', data: null };
    return { status: 'success', description: 'relation created successfully', data: relation };
}

/**
 * Edit a relation between two tables.
 * @param {number} id - id of the relation row to edit.
 * @param {number} id_1 - new id_1 value.
 * @param {number} id_2 - new id_2 value.
 * @param {string} table_1 - new table_1 value.
 * @param {string} table_2 - new table_2 value.
 * @param {string} relation_type - new relation_type value. 
 * @returns {{status: string, description: string, data: object}} Result object containing status, description, and stored data.
 */
_.UpdateRelation = (id, id_1, id_2, table_1, table_2, relation_type) => {
    // Validations.
    const validation = validations.ValidateEditRelation(id, id_1, id_2, table_1, table_2, relation_type);
    if (validation.status === 'failed') {
        return { status: validation.status, description: validation.description, data: null };
    }

    // Create updated relation object.
    const updatedRelation = new Model({
        id,
        id_1,
        id_2,
        table_1,
        table_2,
        relation_type,
    });

    // Update in the database.
    const res = controller_db.UpdateRelation(updatedRelation);

    // Returning result.
    if (res === false)
        return { status: 'failed', description: 'failed to update relation in the database', data: null };
    return { status: 'success', description: 'relation updated successfully', data: updatedRelation };
}

_.GetAllRelations = () => {
    const rows = controller_db.SelectAllRelations();
    return { status: 'success', description: 'all relations retrieved successfully', data: rows };
}

_.GetRelationById = (id) => {
    const validation_id = validations.ValidateIdProperty(id);
    if (validation_id && validation_id.status === 'failed')
        return { status: validation_id.status, description: validation_id.description, data: null };

    const relation = controller_db.SelectOneById(id);
    if (relation) return { status: 'success', description: 'relation found', data: relation };

    return { status: 'failed', description: 'no relation found with the specified id', data: null };
}

_.GetRelationByTableNames = (table_1, table_2) => {
    const validation_tables = validations.ValidateTable1NTable2(table_1, table_2);
    if (validation_tables && validation_tables.status === 'failed') {
        return { status: validation_tables.status, description: validation_tables.description, data: null };
    }

    const allRelations = controller_db.SelectManyByWhere('table_1 = ? AND table_2 = ?', [table_1, table_2]);

    if (allRelations.length > 0)
        return { status: 'success', description: 'relations found', data: allRelations };

    return { status: 'failed', description: 'no relation found between the specified tables', data: null };
}

_.DeleteRelationById = (id) => {
    const validation_id = validations.ValidateIdProperty(id);
    if (validation_id && validation_id.status === 'failed') {
        return { status: validation_id.status, description: validation_id.description, data: null };
    }

    const res = controller_db.DeleteRelation(id);
    if (res === false)
        return { status: 'failed', description: 'failed to delete relation from the database', data: null };
    return { status: 'success', description: 'relation deleted successfully', data: null };
}

module.exports = _
