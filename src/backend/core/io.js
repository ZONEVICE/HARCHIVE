const fs = require('fs')
const _ = {}

// Can check both directory and file existence.
_.pathExists = path => fs.existsSync(path)

_.readDirectoryContent = path => {
    if (fs.existsSync(path) === false) {
        console.warn(`Directory "${path}" does not exist.`)
        return []
    }
    return fs.readdirSync(path)
}

// Recursive, so a missing parent directory is created too instead of throwing ENOENT.
_.createDirectory = path => {
    if (fs.existsSync(path) === false) fs.mkdirSync(path, { recursive: true });
}

_.createFile = (path, content = undefined) => {
    if (content == undefined) content = '';
    fs.writeFileSync(path, content, 'utf-8')
}

// Reads a JSON file and gives back the parsed object, or {} when the file is not there.
//  It used to return the raw Buffer, so the caller got two different types out of one function.
_.readJsonFile = path => {
    if (_.pathExists(path) === false) return {};
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

// Takes the object, not a string: serialising is this function's job, which is what makes it
//  the counterpart of readJsonFile above.
_.writeJsonFile = (path, content) => {
    fs.writeFileSync(path, JSON.stringify(content, null, 4), 'utf-8');
}

_.copyFile = (source, destination) => {
    if (_.pathExists(source) === false) {
        console.warn(`Source file "${source}" does not exist.`);
        return;
    }
    fs.copyFileSync(source, destination);
}

_.deleteFile = (path) => {
    if (_.pathExists(path)) {
        fs.unlinkSync(path);
    }
}

module.exports = _
