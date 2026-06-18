const db = require('./core/db')

// --------------------------------------------------------------------------------
// Creates data directory and database if not exist.
// --------------------------------------------------------------------------------
db.CreateDatabaseFile()

// --------------------------------------------------------------------------------
// Processes database tables and default data if needed.
// --------------------------------------------------------------------------------
const metadata_controller = require('./metadata/repository');
metadata_controller.createTable();

const file_repository = require('./file/repository');
file_repository.createTable();

const user_repository = require('./user/repository');
user_repository.CreateTable();
user_repository.CreateAdminUser();

const relation_repository = require('./relation/repository');
relation_repository.createTable();

// --------------------------------------------------------------------------------
// Starts web server
// --------------------------------------------------------------------------------
const app = require('./web/server');
const { PORT } = require('./core/env');

app.listen(PORT, () => { console.log(`HARCHIVE backend listening on port: ${PORT}.`); });
