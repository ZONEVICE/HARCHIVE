module.exports = class Relation {
    id = ''
    id_1 = ''
    id_2 = ''
    table_1 = ''
    table_2 = ''
    relation_type = ''

    /**
     * Assings properties from init object.
     * @param {Object} init
     * @param {Object} init.[Property] - Any property of the Relation class.
     * @example { id: '123', ... }
     */
    constructor(init) {
        Object.assign(this, init)
    }

    // Basically same as using Constructor but in an existing object.
    SetObjectFromDBRows(row) {
        Object.keys(row).forEach(key => {
            if (key in this) this[key] = row[key];
        });
    }
}
