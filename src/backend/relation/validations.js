const _ = {}

const types = require('./types')

// Validates if properties table_1 and table_2.
_.ValidateTable1NTable2 = (table_1, table_2) => {
    // Check tables are different
    if (table_1 === table_2) {
        return { status: 'failed', description: 'tables must be different' };
    }

    // Check if tables are valid
    if (!types.Tables.includes(table_1) || !types.Tables.includes(table_2)) {
        return { status: 'failed', description: 'one or both tables are invalid' };
    }
}

_.ValidateIdProperty = (id) => {
    // Check if id is a valid number
    if (!id || typeof id !== 'number' || id <= 0) {
        return { status: 'failed', description: 'id is invalid' };
    }
}

// Validates only one table property.
_.ValidateTableProperty = (table) => {
    // Check if table is valid
    if (!types.Tables.includes(table)) {
        return { status: 'failed', description: 'table is invalid' };
    }
}

_.ValidateCreateRelation = (id_1, id_2, table_1, table_2, relation_type) => {
    // Check if tables are the same
    const tableValidation = _.ValidateTable1NTable2(table_1, table_2);
    if (tableValidation && tableValidation.status === 'failed') {
        return tableValidation;
    }

    // Check if relation type is valid
    if (!types.RelationTypes.includes(relation_type)) {
        return { status: 'failed', description: 'relation type is invalid' };
    }

    return { status: 'success', description: 'validation successful' };
}

_.ValidateEditRelation = (id, id_1, id_2, table_1, table_2, relation_type) => {
    // Check if ID is valid
    const idValidation = _.ValidateIdProperty(id);
    if (idValidation && idValidation.status === 'failed') {
        return { status: idValidation.status, description: idValidation.description };
    }

    // Reuse create relation validation
    const createValidation = _.ValidateCreateRelation(id_1, id_2, table_1, table_2, relation_type);
    if (createValidation.status === 'failed') {
        return createValidation;
    }

    return { status: 'success', description: 'validation successful' };
}

module.exports = _
