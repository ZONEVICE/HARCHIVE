const db = require('./core/db')

// --------------------------------------------------------------------------------
// Creates data directory and database if not exist.
// --------------------------------------------------------------------------------
db.createDatabaseFile()

// --------------------------------------------------------------------------------
// Processes database tables if needed.
// --------------------------------------------------------------------------------
const metadata_repository = require('./metadata/repository');
metadata_repository.createTable();

const file_repository = require('./file/repository');
file_repository.createTable();

const user_repository = require('./user/repository');
user_repository.createTable();

const relation_repository = require('./relation/repository');
relation_repository.createTable();

const tag_repository = require('./tag/repository');
tag_repository.createTable();

const directory_repository = require('./directory/repository');
directory_repository.createTable();

const workspace_repository = require('./workspace/repository');
workspace_repository.createTable();

const permission_repository = require('./permission/repository');
permission_repository.createTable();

// --------------------------------------------------------------------------------
// Loads the default data the application cannot run without.
// --------------------------------------------------------------------------------
const seeder_service = require('./seeder/service');
seeder_service.seed();

// --------------------------------------------------------------------------------
// Starts web server
// --------------------------------------------------------------------------------
const app = require('./web/app');
const { PORT } = require('./core/env');

app.listen(PORT, () => { console.log(`HARCHIVE backend listening on port: ${PORT}.`); });
