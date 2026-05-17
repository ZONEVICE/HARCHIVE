const _ = {}

_.ValidateAllowDownloads = (allow_downloads) => {
    if (allow_downloads === undefined || allow_downloads === null) {
        return { status: 'warning', description: 'allow_downloads is required' };
    }
    if (typeof allow_downloads !== 'number') {
        return { status: 'warning', description: 'allow_downloads must be a number' };
    }
    return { status: 'success', description: 'validation successful' };
}

_.ValidateAllowFileSytemBrowser = (allow_file_system_browser) => {
    if (allow_file_system_browser === undefined || allow_file_system_browser === null) {
        return { status: 'warning', description: 'allow_file_system_browser is required' };
    }
    if (typeof allow_file_system_browser !== 'number') {
        return { status: 'warning', description: 'allow_file_system_browser must be a number' };
    }
    return { status: 'success', description: 'validation successful' };
}

_.ValidateRegisterLogs = (register_logs) => {
    if (register_logs === undefined || register_logs === null) {
        return { status: 'warning', description: 'register_logs is required' };
    }
    if (typeof register_logs !== 'number') {
        return { status: 'warning', description: 'register_logs must be a number' };
    }
    return { status: 'success', description: 'validation successful' };
}

_.ValidateSettings = (allow_downloads, allow_file_system_browser, register_logs) => {
    const v1 = _.ValidateAllowDownloads(allow_downloads);
    if (v1.status === 'warning') return v1;

    const v2 = _.ValidateAllowFileSytemBrowser(allow_file_system_browser);
    if (v2.status === 'warning') return v2;

    const v3 = _.ValidateRegisterLogs(register_logs);
    if (v3.status === 'warning') return v3;

    return { status: 'success', description: 'validation successful' };
}

module.exports = _
