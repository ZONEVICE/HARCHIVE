const constants = require('./logical/constants')
const io = require('./helpers/io')

// --------------------------------------------------------------------------------
// Creates data directory if not exists
// --------------------------------------------------------------------------------
if (io.path_exists(constants.DATA_DIRECTORY) === false) {
    console.warn('WARN: data directory not found. Creating...')
    io.create_directory(constants.DATA_DIRECTORY)
    console.log('Data directory created.')
}

// --------------------------------------------------------------------------------
// Creates database file if it does not exist
// Fills database file with tables and initial data if not found
// --------------------------------------------------------------------------------
const db_init = require('./db/init')
db_init.create_database_file()
db_init.resolve_database_empty()

// --------------------------------------------------------------------------------
// Loads app settings
// --------------------------------------------------------------------------------
const settings_controller = require('./controllers/settings')
const settings_model = settings_controller.load_data()
console.log(settings_model)

// --------------------------------------------------------------------------------
// Starts web server
// --------------------------------------------------------------------------------
console.log('Ok > todo start backend service')

const app = require('./web/server');
const { PORT } = require('./logical/env');

app.listen(PORT, () => { console.log(`Harchive backend listening on port: ${PORT}.`); });
