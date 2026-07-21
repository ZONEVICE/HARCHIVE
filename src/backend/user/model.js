const { generateUUIDv4 } = require('../core/id')

module.exports = class User {
    #id = generateUUIDv4()
    #username = ''
    #password = ''

    setClass(id, username, password) {
        this.#id = id
        this.#username = username
        this.#password = password
    }

    get id() { return this.#id }
    set id(v) { this.#id = v }

    get username() { return this.#username }
    set username(v) { this.#username = v }

    get password() { return this.#password }
    set password(v) { this.#password = v }
}
