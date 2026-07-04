const repository = require('./repository');

const _ = {};

/**
 * Default user login handler.
 * @param {String} req.body.password User password.
 */
_.login = async (req, res) => {
    const { password } = req.body;

    const admin_user = repository.LoadAdminUser();

    if (admin_user.password === password) {
        res.json({ status: 'success', description: 'login successful' });
    } else {
        res.status(401).json({ status: 'warning', description: 'invalid credentials' });
    }
}

/**
 * Change password for the default user.
 * @param {String} req.body.old_password Current password.
 * @param {String} req.body.new_password New password.
 */
_.changePassword = async (req, res) => {
    const { old_password, new_password } = req.body;

    const admin_user = repository.LoadAdminUser();

    if (admin_user.password === old_password) {
        repository.SetPassword(admin_user.id, new_password);
        res.json({ status: 'success', description: 'password changed successfully' });
    } else {
        res.status(401).json({ status: 'warning', description: 'invalid credentials' });
    }
}

module.exports = _;
