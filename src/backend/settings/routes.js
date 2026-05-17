const controller_db = require('./controller_db');
const Model = require('./model');
const validators = require('./validators');

module.exports = app => {
    // Get settings.
    app.get('/api/settings/', async (req, res) => {
        try {
            const settings = controller_db.LoadData();
            res.status(200).json({ status: 'success', description: 'settings retrieved', data: settings });
        } catch (error) {
            res.status(500).json({ status: 'failed', description: 'settings could not be retrieved' });
        }
    });
    /**
     * Save settings.
     * @bodyparam {number} req.body.allow_downloads
     * @bodyparam {number} req.body.allow_file_system_browser
     * @bodyparam {number} req.body.register_logs
     */
    app.put('/api/settings/', async (req, res) => {
        try {
            const { allow_downloads, allow_file_system_browser, register_logs } = req.body;

            const validation = validators.ValidateSettings(allow_downloads, allow_file_system_browser, register_logs);
            if (validation.status === 'warning') {
                return res.status(400).json({ status: 'failed', description: validation.description });
            }

            const settings = new Model({
                allow_downloads,
                allow_file_system_browser,
                register_logs,
            });
            const saved = controller_db.SaveData(settings);
            if (!saved) {
                return res.status(500).json({ status: 'failed', description: 'settings could not be saved' });
            }
            res.status(200).json({ status: 'success', description: 'settings saved' });
        } catch (error) {
            res.status(500).json({ status: 'failed', description: 'settings could not be saved' });
        }
    });
}
