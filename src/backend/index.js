const db = require('./logic/db')

// --------------------------------------------------------------------------------
// Creates data directory and database if not exist.
// --------------------------------------------------------------------------------
db.CreateDatabaseFile()

// --------------------------------------------------------------------------------
// Processes database tables and default data if needed.
// --------------------------------------------------------------------------------
const settings_controller = require('./settings/controller_db');
settings_controller.CreateTable();
settings_controller.CreateDefaultRecord();

const user_controller = require('./user/controller_db');
user_controller.CreateTable();
user_controller.CreateAdminUser();

// --------------------------------------------------------------------------------
// Starts web server
// --------------------------------------------------------------------------------
const app = require('./web/server');
const { PORT } = require('./logic/env');

app.listen(PORT, () => { console.log(`Harchive backend listening on port: ${PORT}.`); });
