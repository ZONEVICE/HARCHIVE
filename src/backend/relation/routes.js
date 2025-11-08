const controller_logic = require('./controller_logic')

module.exports = app => {
    // Get all relations.
    app.get('/api/relation/', async (req, res) => {
        const relations = controller_logic.GetAllRelations();
        res.status(200).json(relations);
    });
    // Get relation by ID.
    app.get('/api/relation/:id/', async (req, res) => {
        const response = controller_logic.GetRelationById(parseInt(req.params.id));
        if (response.status === 'success') {
            res.status(200).json(response);
        } else {
            res.status(400).json(response);
        }
    });
    /**
     * Get relations by filter.
     * @param todo
     */
    app.post('/api/relation/filter/', async (req, res) => {
        // todo
    });
    // Edit existing relation.
    app.put('/api/relation/:id/', async (req, res) => {
        // todo
    });
    // Delete relation.
    app.delete('/api/relation/:id/', async (req, res) => {
        // todo
    });
}
