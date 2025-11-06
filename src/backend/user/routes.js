const controller_db = require('./controller_db');

module.exports = app => {
    /**
     * Default user login route.
     * @param {String} req.password User password.
     */
    app.post('/api/user/login/', async (req, res) => {
        const { password } = req.body;

        const admin_user = controller_db.LoadUserById('1');

        if (admin_user.password === password) {

            res.json({ status: 'success', description: 'login successful' });
        } else {
            res.status(401).json({ status: 'warning', description: 'invalid credentials' });
        }
    })
    /**
     * Change password for default user.
     * @param {String} req.old_password Current password.
     * @param {String} req.new_password New password.
     */
    app.post('/api/user/change_password/', async (req, res) => {
        const { old_password, new_password } = req.body;

        const admin_user = controller_db.LoadUserById('1');

        if (admin_user.password === old_password) {
            controller_db.SetPassword('1', new_password);
            res.json({ status: 'success', description: 'password changed successfully' });
        } else {
            res.status(401).json({ status: 'warning', description: 'invalid credentials' });
        }
    });
}
