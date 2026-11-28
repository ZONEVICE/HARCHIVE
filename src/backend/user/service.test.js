// =====================================================================================
// IMPORTS.
// =====================================================================================

// The service under test, called directly.
const user_service = require('./service')

// The seeded account's name, spelled the way the owner writes it.
const { ADMIN_USERNAME } = require('./util')

// =====================================================================================
// CONSTANTS.
// =====================================================================================

// Suffix of this run, so nothing collides with a row another suite or run left behind.
const RUN = Date.now()

// The account this suite creates, typed with capitals and an accent.
const USERNAME_TYPED = `Josué-Service-${RUN}`

// The same name as the column stores it: composed, trimmed and folded.
const USERNAME_STORED = USERNAME_TYPED.normalize('NFC').toLowerCase()

// =====================================================================================
// STATE.
// =====================================================================================

// The stored row of the account this suite creates.
let created = null

// =====================================================================================
// SETUP AND CLEANUP.
// =====================================================================================

// The account, created the way the seeder creates one: no route creates a user.
beforeAll(() => {
    created = user_service.create(user_service.buildForCreate({ username: `  ${USERNAME_TYPED.normalize('NFD')}  `, password: 'secret' }))
})

// Purges the account whatever state the tests left it in.
afterAll(() => {
    user_service.hardDelete(created.id)
})

// =====================================================================================
// MODEL CONSTRUCTION AND WRITES.
// =====================================================================================

describe('buildForCreate and create', () => {
    it('stores the identity key folded and the typed spelling beside it', () => {
        expect(created.username).toBe(USERNAME_STORED)
        expect(created.username_cased).toBe(USERNAME_TYPED.normalize('NFC'))
        expect(typeof created.id).toBe('number')
    })

    it('answers a plain row, never a model instance', () => {
        // A row is a plain object: it carries the columns and none of the model's accessors.
        expect(created.getUsername).toBeUndefined()
        expect(JSON.parse(JSON.stringify(created)).username).toBe(USERNAME_STORED)
    })
})

describe('setPassword', () => {
    it('writes the password composed, and answers the row as it ended up', () => {
        const updated = user_service.setPassword(created.id, 'Contraseña'.normalize('NFD'))
        expect(updated.password).toBe('Contraseña'.normalize('NFC'))
    })

    it('answers null for an id nobody holds', () => {
        expect(user_service.setPassword(999999999, 'x')).toBeNull()
    })
})

// =====================================================================================
// READS.
// =====================================================================================

describe('getAll', () => {
    it('lists the account', () => {
        expect(user_service.getAll().some((user) => user.id === created.id)).toBe(true)
    })
})

describe('getById', () => {
    it('finds the account, and answers null for an id nobody holds', () => {
        expect(user_service.getById(created.id).username).toBe(USERNAME_STORED)
        expect(user_service.getById(999999999)).toBeNull()
    })
})

describe('getByUsername', () => {
    it('finds the account in any casing, accent shape or padding', () => {
        expect(user_service.getByUsername(USERNAME_TYPED.toUpperCase()).id).toBe(created.id)
        expect(user_service.getByUsername(`  ${USERNAME_STORED.normalize('NFD')} `).id).toBe(created.id)
    })

    it('never resolves an account through username_cased', () => {
        // The lookup goes by the folded key alone; a different name is a different account.
        expect(user_service.getByUsername(`${USERNAME_TYPED}-other`)).toBeNull()
    })
})

describe('getAdminUser', () => {
    it('finds the seeded account, whose typed spelling survives in username_cased', () => {
        const admin = user_service.getAdminUser()
        expect(admin.username).toBe(ADMIN_USERNAME.toLowerCase())
        expect(admin.username_cased).toBe(ADMIN_USERNAME)
    })
})

// =====================================================================================
// UNIQUENESS GUARDS.
// =====================================================================================

describe('isUsernameTaken', () => {
    it('is true for the name in any case, false for a free one', () => {
        expect(user_service.isUsernameTaken(USERNAME_TYPED.toUpperCase())).toBe(true)
        expect(user_service.isUsernameTaken(`free-${RUN}`)).toBe(false)
    })
})

describe('isUsernameTakenByAnother', () => {
    it('lets an account keep its own name, and refuses it to another', () => {
        expect(user_service.isUsernameTakenByAnother(USERNAME_TYPED, created.id)).toBe(false)
        expect(user_service.isUsernameTakenByAnother(ADMIN_USERNAME, created.id)).toBe(true)
    })
})

// =====================================================================================
// SESSION.
// =====================================================================================

describe('changePassword', () => {
    it('answers false and writes nothing when the current password does not match', () => {
        expect(user_service.changePassword(created.id, 'wrong', 'new')).toBe(false)
        expect(user_service.getById(created.id).password).toBe('Contraseña'.normalize('NFC'))
    })

    it('answers false for an account that does not exist', () => {
        expect(user_service.changePassword(999999999, 'x', 'y')).toBe(false)
    })
})

// =====================================================================================
// PHYSICAL DELETES.
// =====================================================================================

describe('hardDelete', () => {
    it('removes the account for good', () => {
        const purged = user_service.create(user_service.buildForCreate({ username: `purged-${RUN}`, password: 'x' }))

        user_service.hardDelete(purged.id)

        expect(user_service.getById(purged.id)).toBeNull()
    })
})
