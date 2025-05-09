module.exports = class Settings {

    constructor(options = {}) {
        const defaults = {
            allow_downloads: true,
            allow_file_system_browser: true,
            register_logs: true,
        };

            for (const key of Object.keys(defaults)) {
            // Sets class properties.
            this[key] = options.hasOwnProperty(key) ? options[key] : defaults[key];
        }
    }

}
