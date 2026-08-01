const Directory = require('./model')
const repository = require('./repository')
const { getSystemTime } = require('../core/time')

const _ = {}

// --------------------------------------------------------------------------------
// Data access. This service is the only door to repository.js: a controller never
//  reaches the repository itself, it always comes through here.
// --------------------------------------------------------------------------------
_.getAll = () => repository.getAll()
_.getById = (id) => repository.getById(id)
_.create = (directory) => repository.post(directory)
_.update = (directory) => repository.update(directory)

// Resolves the deleted_at value to store on update. The client sends a boolean, never a
//  timestamp: true stamps the current system time, false clears the mark, and null (or an
//  absent field) does nothing — it keeps whatever the stored row already had.
_.resolveDeletedAt = (current, deleted_at_flag) => {
    if (deleted_at_flag === undefined || deleted_at_flag === null) return current ? current.deleted_at : null
    return deleted_at_flag ? getSystemTime() : null
}

// Builds a Directory from a create request. The id is assigned by the database and deleted_at
//  defaults to null; a date the client omits is stored as null.
_.buildForCreate = (body) => {
    const directory = new Directory()
    directory.name = body.name
    directory.date_scan = body.date_scan ?? null
    directory.date_creation = body.date_creation ?? null
    directory.date_last_modification = body.date_last_modification ?? null
    return directory
}

// Builds a Directory from an update request. It resolves deleted_at itself from the stored row
//  and the client flag, so the controller does not deal with timestamps.
_.buildForUpdate = (current, body) => {
    const deleted_at = _.resolveDeletedAt(current, body.deleted_at)
    const directory = new Directory()
    directory.setClass(body.id, body.name, body.date_scan, body.date_creation, body.date_last_modification, deleted_at)
    return directory
}

// Soft-delete: stamp deleted_at instead of removing the row, so the record stays readable and
//  the relations pointing at this directory keep resolving it.
_.softDelete = (id) => repository.softDelete(id, getSystemTime())

// Hard-delete: physically removes the row. Deliberately not wired to any HTTP endpoint —
//  it exists for backend code that genuinely needs to purge a record.
_.hardDelete = (id) => repository.deleteById(id)

module.exports = _
