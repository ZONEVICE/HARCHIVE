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
const user_service = require('./user/service');
user_repository.CreateTable();
user_service.createAdminUser();

const relation_repository = require('./relation/repository');
relation_repository.createTable();

const tag_repository = require('./tag/repository');
tag_repository.createTable();

const directory_repository = require('./directory/repository');
directory_repository.createTable();

const workspace_repository = require('./workspace/repository');
workspace_repository.createTable();

// The permission seed runs last: its default rows are linked to the admin user through a
//  relation record, so the user and relation tables have to exist already.
const permission_repository = require('./permission/repository');
const permission_service = require('./permission/service');
permission_repository.createTable();
permission_service.createDefaultPermissions();
permission_service.linkAdminUser();

// --------------------------------------------------------------------------------
// Starts web server
// --------------------------------------------------------------------------------
const app = require('./web/server');
const { PORT } = require('./core/env');

app.listen(PORT, () => { console.log(`HARCHIVE backend listening on port: ${PORT}.`); });
