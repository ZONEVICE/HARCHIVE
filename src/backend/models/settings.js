const settings_controller = require('../controllers/settings')

module.exports = class Settings {
    constructor(allow_downloads, allow_file_system_browser) {
        this.allow_downloads = allow_downloads
        this.allow_file_system_browser = allow_file_system_browser
    }
}
