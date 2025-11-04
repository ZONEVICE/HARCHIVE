const fs = require('fs')
const _ = {}

// Can check both directory and file existence.
_.PathExists = path => fs.existsSync(path)

_.ReadDirectoryContent = path => {
    if (fs.existsSync(path) === false) {
        console.warn(`Directory "${path}" does not exist.`)
        return []
    }
    return fs.readdirSync(path)
}

_.CreateDirectory = path => {
    if (fs.existsSync(path) === false) fs.mkdirSync(path);
}

_.CreateFile = (path, content = undefined) => {
    if (content == undefined) content = '';
    fs.writeFileSync(path, content, 'utf-8')
}

_.ReadJsonFile = path => {
    if (_.PathExists(path) === false) return {};
    return fs.readFileSync(path)
}

_.WriteJsonFile = (path, content) => {
    if (_.PathExists(path) === false) _.CreateFile(path, content);
    else fs.writeFileSync(path, content);
}

_.CopyFile = (source, destination) => {
    if (_.PathExists(source) === false) {
        console.warn(`Source file "${source}" does not exist.`);
        return;
    }
    fs.copyFileSync(source, destination);
}

_.DeleteFile = (path) => {
    if (_.PathExists(path)) {
        fs.unlinkSync(path);
    }
}

module.exports = _
