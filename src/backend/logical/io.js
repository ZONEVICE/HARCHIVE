const fs = require('fs')
const _ = {}

// checks directories or binaries
_.path_exists = path => fs.existsSync(path)

_.read_directory_content = path => {
    if (fs.existsSync(path) === false) {
        console.warn(`Directory "${path}" does not exist.`)
        return []
    }
    return fs.readdirSync(path)
}

_.create_directory = path => {
    if (fs.existsSync(path) === false) fs.mkdirSync(path);
}

_.create_file = (path, content = undefined) => {
    if (content == undefined) content = '';
    fs.writeFileSync(path, content, 'utf-8')
}

_.read_json_file = path => {
    if (_.path_exists(path) === false) return {};
    return fs.readFileSync(path)
}

_.write_json_file = (path, content) => {
    if (_.path_exists(path) === false) _.create_file(path, content);
    else fs.writeFileSync(path, content);
}

module.exports = _
