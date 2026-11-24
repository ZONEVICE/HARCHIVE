// =====================================================================================
// IMPORTS.
// =====================================================================================

const fs = require('fs')

// Everything this file publishes.
const _ = {}

// =====================================================================================
// PATHS.
// =====================================================================================

/**
 * Says whether something exists at a path, a directory as well as a file.
 * @param {String} path Absolute or relative path to look at.
 * @returns {Boolean} True when there is something there.
 */
_.pathExists = (path) => fs.existsSync(path)

// =====================================================================================
// DIRECTORIES.
// =====================================================================================

/**
 * Lists the names a directory holds.
 * @param {String} path Directory to read.
 * @returns {String[]} The entry names, empty when the directory is not there.
 */
_.readDirectoryContent = (path) => {
    // A missing directory is not an error here: the caller gets an empty list and a warning
    //  in the log, rather than an exception to wrap.
    if (fs.existsSync(path) === false) {
        console.warn(`Directory "${path}" does not exist.`)
        return []
    }

    // The names only, in the order the filesystem gives them.
    return fs.readdirSync(path)
}

/**
 * Creates a directory when it is missing.
 * @param {String} path Directory to create.
 */
_.createDirectory = (path) => {
    // Recursive, so a missing parent is created too instead of throwing ENOENT.
    if (fs.existsSync(path) === false) fs.mkdirSync(path, { recursive: true })
}

// =====================================================================================
// FILES.
// =====================================================================================

/**
 * Writes a file, overwriting whatever was there.
 * @param {String} path File to write.
 * @param {String} content Optional. What to write. Absent means an empty file.
 */
_.createFile = (path, content = '') => {
    fs.writeFileSync(path, content, 'utf-8')
}

/**
 * Copies a file. A missing source is a warning, not an exception.
 * @param {String} source File to copy.
 * @param {String} destination Where to copy it, overwritten when it exists.
 */
_.copyFile = (source, destination) => {
    // Nothing to copy: logged and skipped.
    if (_.pathExists(source) === false) {
        console.warn(`Source file "${source}" does not exist.`)
        return
    }

    fs.copyFileSync(source, destination)
}

/**
 * Removes a file when it is there. Deleting what is already gone does nothing.
 * @param {String} path File to remove.
 */
_.deleteFile = (path) => {
    if (_.pathExists(path) === true) fs.unlinkSync(path)
}

// =====================================================================================
// JSON FILES.
//  The two below are counterparts: one parses on the way in, the other serialises on the way
//  out, so a caller passes and receives objects and never a string or a Buffer.
// =====================================================================================

/**
 * Reads a JSON file and parses it.
 * @param {String} path File to read.
 * @returns {Object} The parsed content, or an empty object when the file is not there.
 */
_.readJsonFile = (path) => {
    // A missing file reads as an empty object, so the caller never wraps this in a try.
    if (_.pathExists(path) === false) return {}

    return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

/**
 * Serialises an object into a JSON file, indented so it stays readable by hand.
 * @param {String} path File to write.
 * @param {Object} content The object to store. Serialising it is this function's job.
 */
_.writeJsonFile = (path, content) => {
    fs.writeFileSync(path, JSON.stringify(content, null, 4), 'utf-8')
}

module.exports = _
