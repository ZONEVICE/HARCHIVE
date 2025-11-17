const _ = {}

const types = require('./types')

// Validates if properties table_1 and table_2.
_.ValidateTable1NTable2 = (table_1, table_2) => {
    // Check tables are different
    if (table_1 === table_2) {
        return { status: 'error', description: 'tables must be different' };
    }

    // Reuse ValidateTableProperty for both tables
    const table1Validation = _.ValidateTableProperty(table_1);
    if (table1Validation && table1Validation.status === 'error') {
        return { status: 'error', description: `table_1: ${table1Validation.description}` };
    }
    const table2Validation = _.ValidateTableProperty(table_2);
    if (table2Validation && table2Validation.status === 'error') {
        return { status: 'error', description: `table_2: ${table2Validation.description}` };
    }

    return { status: 'success', description: 'validation successful' };
}

_.ValidateIdProperty = (id) => {
    // Check if id is a valid number
    if (!id || typeof id !== 'number' || id <= 0) {
        return { status: 'error', description: 'id is invalid' };
    }

    return { status: 'success', description: 'validation successful' };
}

// Validates only one table property.
_.ValidateTableProperty = (table) => {
    // Check table type
    if (typeof table !== 'string') {
        return { status: 'error', description: 'table must be a string' };
    }

    // Check if table is valid
    if (!types.Tables.includes(table)) {
        return { status: 'error', description: 'table is invalid' };
    }

    return { status: 'success', description: 'validation successful' };
}

_.ValidateCreateRelation = (id_1, id_2, table_1, table_2, relation_type) => {
    // Check if tables are the same
    const tableValidation = _.ValidateTable1NTable2(table_1, table_2);
    if (tableValidation && tableValidation.status === 'error') {
        return tableValidation;
    }

    // Check if id_1 is valid
    const id1Validation = _.ValidateIdProperty(id_1);
    if (id1Validation && id1Validation.status === 'error') {
        return { status: id1Validation.status, description: 'id_1 is invalid' };
    }

    // Check if id_2 is valid
    const id2Validation = _.ValidateIdProperty(id_2);
    if (id2Validation && id2Validation.status === 'error') {
        return { status: id2Validation.status, description: 'id_2 is invalid' };
    }

    // Check if relation type is valid
    if (!types.RelationTypes.includes(relation_type)) {
        return { status: 'error', description: 'relation type is invalid' };
    }

    return { status: 'success', description: 'validation successful' };
}

_.ValidateEditRelation = (id, id_1, id_2, table_1, table_2, relation_type) => {
    // Check if ID is valid
    const idValidation = _.ValidateIdProperty(id);
    if (idValidation && idValidation.status === 'error') {
        return { status: idValidation.status, description: idValidation.description };
    }

    // Reuse create relation validation
    const createValidation = _.ValidateCreateRelation(id_1, id_2, table_1, table_2, relation_type);
    if (createValidation.status === 'error') {
        return createValidation;
    }

    return { status: 'success', description: 'validation successful' };
}

_.ValidateRelationType = relation_type => {
    // Check relation type
    if (typeof relation_type !== 'string') {
        return { status: 'error', description: 'relation type must be a string' };
    }

    // Check if relation type is valid
    if (!types.RelationTypes.includes(relation_type)) {
        return { status: 'error', description: 'relation type is invalid' };
    }

    return { status: 'success', description: 'validation successful' };
}

module.exports = _
