module.exports = class Settings {
    /**
     * @param {object} options
     * @param {number} [options.allow_downloads]
     * @param {number} [options.allow_file_system_browser]
     * @param {string} [options.register_logs]
     */
    constructor(options = {}) {
        const defaults = {
            allow_downloads: true,
            allow_file_system_browser: true,
            register_logs: true,
        };
        for (const key of Object.keys(defaults)) {
            this[key] = options.hasOwnProperty(key) ? options[key] : defaults[key];
        }
    }
}
