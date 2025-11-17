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
    if (validation.status === 'error') {
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
        return { status: 'error', description: 'failed to create relation in the database', data: null };
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
    if (validation.status === 'error') {
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
        return { status: 'error', description: 'failed to update relation in the database', data: null };
    return { status: 'success', description: 'relation updated successfully', data: updatedRelation };
}

_.GetAllRelations = () => {
    const rows = controller_db.SelectAllRelations();
    return { status: 'success', description: 'all relations retrieved successfully', data: rows };
}

_.GetRelationById = id => {
    const validation_id = validations.ValidateIdProperty(id);
    if (validation_id && validation_id.status === 'error')
        return { status: validation_id.status, description: validation_id.description, data: null };

    const relation = controller_db.SelectOneById(id);
    if (relation) return { status: 'success', description: 'relation found', data: relation };

    return { status: 'error', description: 'no relation found with the specified id', data: null };
}

_.GetManyById1 = id_1 => {
    const validation_id1 = validations.ValidateIdProperty(id_1);
    if (validation_id1 && validation_id1.status === 'error')
        return { status: validation_id1.status, description: validation_id1.description, data: null };

    const relations = controller_db.SelectManyId1(id_1);
    if (relations.length > 0)
        return { status: 'success', description: 'relations found', data: relations };

    return { status: 'error', description: 'no relations found with the specified id_1', data: null };
}

_.GetById1NId2 = (id_1, id_2) => {
    const validation_id_1 = validations.ValidateIdProperty(id_1);
    if (validation_id_1 && validation_id_1.status === 'error') {
        return { status: validation_id_1.status, description: validation_id_1.description, data: null };
    }

    const validation_id_2 = validations.ValidateIdProperty(id_2);
    if (validation_id_2 && validation_id_2.status === 'error') {
        return { status: validation_id_2.status, description: validation_id_2.description, data: null };
    }

    const relation = controller_db.SelectOneById1NId2(id_1, id_2);
    if (relation) return { status: 'success', description: 'relation found', data: relation };

    return { status: 'error', description: 'no relation found with the specified id_1 and id_2', data: null };
}

_.GetManyByTable1 = table_1 => {
    const validation_table = validations.ValidateTableProperty(table_1);
    if (validation_table && validation_table.status === 'error') {
        return { status: validation_table.status, description: validation_table.description, data: null };
    }

    const allRelations = controller_db.SelectManyByTable1(table_1);

    if (allRelations.length > 0)
        return { status: 'success', description: 'relations found', data: allRelations };

    return { status: 'error', description: 'no relation found for the specified table_1', data: null };
}

_.GetByTable1NTable2 = (table_1, table_2) => {
    const validation_tables = validations.ValidateTable1NTable2(table_1, table_2);
    if (validation_tables && validation_tables.status === 'error') {
        return { status: validation_tables.status, description: validation_tables.description, data: null };
    }

    const allRelations = controller_db.SelectManyByTable1NTable2(table_1, table_2);

    if (allRelations.length > 0)
        return { status: 'success', description: 'relations found', data: allRelations };

    return { status: 'error', description: 'no relation found between the specified tables', data: null };
}

_.GetManyByRelationType = (relation_type) => {
    const validation_relation_type = validations.ValidateRelationType(relation_type);
    if (validation_relation_type && validation_relation_type.status === 'error') {
        return { status: validation_relation_type.status, description: validation_relation_type.description, data: null };
    }

    const allRelations = controller_db.SelectManyByRelationType(relation_type);

    if (allRelations.length > 0)
        return { status: 'success', description: 'relations found', data: allRelations };

    return { status: 'error', description: 'no relation found for the specified relation type', data: null };
}

_.DeleteRelationById = (id) => {
    const validation_id = validations.ValidateIdProperty(id);
    if (validation_id && validation_id.status === 'error') {
        return { status: validation_id.status, description: validation_id.description, data: null };
    }

    const res = controller_db.DeleteRelation(id);
    if (res === false)
        return { status: 'success', description: 'relation not found or already deleted', data: null };
    return { status: 'success', description: 'relation deleted successfully', data: null };
}

module.exports = _
