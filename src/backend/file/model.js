const { generateId } = require('../core/id')

class File {
    #id = generateId()
    #name = ''
    #hash_256_sha = ''
    #relative_path = ''
    #extension = ''
    #tags = []

    setClass(id, name, hash_256_sha, relative_path, extension, tags) {
        this.#id = id
        this.#name = name
        this.#hash_256_sha = hash_256_sha
        this.#relative_path = relative_path
        this.#extension = extension
        this.#tags = tags
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

    get tags() { return this.#tags }
    set tags(v) { this.#tags = v }
}

module.exports = File
