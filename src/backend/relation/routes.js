const controller_logic = require('./controller_logic')
const types = require('./types')

module.exports = app => {
    // Get all relations.
    app.get('/api/relation/', async (req, res) => {
        const relations = controller_logic.GetAllRelations();
        res.status(200).json(relations);
    });
    // Get relation by ID.
    app.get('/api/relation/:id/', async (req, res) => {
        try {
            const response = controller_logic.GetRelationById(parseInt(req.params.id));
            response.status === 'success'
                ? res.status(200).json(response)
                : res.status(404).json(response);
        } catch (error) {
            res.status(400).json({ status: 'error', message: 'invalid request' });
        }
    });
    /**
     * Create new relation.
     * @bodyparam {string} req.body.id_1
     * @bodyparam {string} req.body.id_2
     * @bodyparam {string} req.body.table_1
     * @bodyparam {string} req.body.table_2
     * @bodyparam {string} req.body.relation_type
     */
    app.post('/api/relation/', async (req, res) => {
        try {
            const response = controller_logic.CreateRelation(
                req.body.id_1,
                req.body.id_2,
                req.body.table_1,
                req.body.table_2,
                req.body.relation_type
            );
            if (response.status === 'success') {
                const relationStored = controller_logic.GetById1NId2(
                    req.body.id_1,
                    req.body.id_2
                );
                response.data.id = relationStored.data.id;
                return res.status(201).json(response);
            } else {
                return res.status(400).json(response);
            }
        } catch (error) {
            res.status(400).json({ status: 'error', message: 'invalid request' });
        }
    });
    /**
     * Get relations by filter.
     * @param {String} req.params.filter - Filter to apply based on the allowed options in types.APIGetFilters.
     * @bodyparam {Number} [id_1]
     * @bodyparam {Number} [id_2]
     * @bodyparam {String} [table_1]
     * @bodyparam {String} [table_2]
     * @bodyparam {String} [relation_type]
     */
    app.post('/api/relation/get/:filter/', async (req, res) => {
        try {
            const filter = req.params.filter;
            if (!types.APIGetFilters.includes(filter))
                return res.status(400).json({ status: 'error', message: 'invalid filter', data: null });

            let _res = null;

            switch (filter) {
                case types.APIGetFilters[0]: // by_id_1
                    _res = controller_logic.GetManyById1(req.body.id_1);
                    return _res.status === 'success'
                        ? res.status(200).json(_res)
                        : res.status(404).json(_res);

                case types.APIGetFilters[1]: // by_id_1_and_id_2
                    _res = controller_logic.GetById1NId2(req.body.id_1, req.body.id_2);
                    return _res.status === 'success'
                        ? res.status(200).json(_res)
                        : res.status(404).json(_res);

                case types.APIGetFilters[2]: // by_table_1
                    _res = controller_logic.GetManyByTable1(req.body.table_1);
                    return _res.status === 'success'
                        ? res.status(200).json(_res)
                        : res.status(404).json(_res);

                case types.APIGetFilters[3]: // by_table_1_and_table_2
                    _res = controller_logic.GetByTable1NTable2(req.body.table_1, req.body.table_2);
                    return _res.status === 'success'
                        ? res.status(200).json(_res)
                        : res.status(404).json(_res);

                case types.APIGetFilters[4]: // by_relation_type
                    _res = controller_logic.GetManyByRelationType(req.body.relation_type);
                    return _res.status === 'success'
                        ? res.status(200).json(_res)
                        : res.status(404).json(_res);

                default:
                    return res.status(400).json({ status: 'error', message: 'invalid filter' });
            }
        } catch (error) {
            res.status(400).json({ status: 'error', message: 'invalid request' });
        }
    });
    /**
     * Edit existing relation.
     * @param {Number} req.params.id
     * @bodyparam {Number} [id_1]
     * @bodyparam {Number} [id_2]
     * @bodyparam {String} [table_1]
     * @bodyparam {String} [table_2]
     * @bodyparam {String} [relation_type]
     */
    app.put('/api/relation/:id/', async (req, res) => {
        try {
            const _res = controller_logic.UpdateRelation(
                parseInt(req.params.id),
                req.body.id_1,
                req.body.id_2,
                req.body.table_1,
                req.body.table_2,
                req.body.relation_type
            );
            _res.status === 'success'
                ? res.status(200).json(_res)
                : res.status(404).json(_res);
        } catch (error) {
            res.status(400).json({ status: 'error', message: 'invalid request' });
        }
    });
    /**
     * Delete relation.
     * @param {Number} req.params.id - ID of the relation to delete.
     */
    app.delete('/api/relation/:id/', async (req, res) => {
        try {
            const _res = controller_logic.DeleteRelationById(parseInt(req.params.id));
            _res.status === 'success'
                ? res.status(200).json(_res)
                : res.status(404).json(_res);
        } catch (error) {
            res.status(400).json({ status: 'error', message: 'invalid request' });
        }
    });
}
