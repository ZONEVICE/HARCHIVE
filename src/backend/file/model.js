const { generateUUIDv4 } = require('../core/id')

class File {
    #id = generateUUIDv4()
    #name = ''
    #hash_256_sha = ''
    #relative_path = ''
    #extension = ''
    #deleted_at = null

    setClass(id, name, hash_256_sha, relative_path, extension, deleted_at) {
        this.#id = id
        this.#name = name
        this.#hash_256_sha = hash_256_sha
        this.#relative_path = relative_path
        this.#extension = extension
        this.#deleted_at = deleted_at ?? null
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get name() { return this.#name }
    set name(v) { this.#name = v }

    get hash_256_sha() { return this.#hash_256_sha }
    set hash_256_sha(v) { this.#hash_256_sha = v }

    get relative_path() { return this.#relative_path }
    set relative_path(v) { this.#relative_path = v }

    get extension() { return this.#extension }
    set extension(v) { this.#extension = v }

    get deleted_at() { return this.#deleted_at }
    set deleted_at(v) { this.#deleted_at = v }
}

module.exports = File
