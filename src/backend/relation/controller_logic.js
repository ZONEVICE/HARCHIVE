const _ = {}

const Model = require('./model')
const controller_db = require('./controller_db')
const types = require('./types')

/**
 * Create a relation between two tables.
 * @param {number} id_1 
 * @param {number} id_2 
 * @param {string} table_1 
 * @param {string} table_2 
 * @param {string} relation_type 
 * @returns {{status: string, description: string, data: object}} Result object containing status, description, and stored data.
 */
_.CreateRelation = (
    id_1 = '',
    id_2 = '',
    table_1 = '',
    table_2 = '',
    relation_type = '',
) => {
    // Validations.
    if (table_1 === table_2)
        return { status: 'failed', description: 'cannot create relation between the same table.', data: null };
    if (types.Tables.includes(table_1) === false || types.Tables.includes(table_2) === false)
        return { status: 'failed', description: 'one or both tables are invalid', data: null };
    if (types.RelationTypes.includes(relation_type) === false)
        return { status: 'failed', description: 'relation type is invalid', data: null };

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

_.EditRelation = () => {
    // todo
}

_.UpdateRelation = () => {
    // todo
}

_.GetAllRelations = () => {
    // todo
}

_.GetRelationByTableIds = () => { 
    // todo
}

module.exports = _
