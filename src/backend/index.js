const db = require('./logical/db')

// --------------------------------------------------------------------------------
// Creates data directory and database if not exist.
// --------------------------------------------------------------------------------
db.CreateDatabaseFile()

// --------------------------------------------------------------------------------
// Processes database tables and default data if needed.
// --------------------------------------------------------------------------------
const settings_controller = require('./settings/controller');
settings_controller.CreateTable();
settings_controller.CreateDefaultRecord();

// --------------------------------------------------------------------------------
// Starts web server
// --------------------------------------------------------------------------------
const app = require('./web/server');
const { PORT } = require('./logical/env');

app.listen(PORT, () => { console.log(`Harchive backend listening on port: ${PORT}.`); });
