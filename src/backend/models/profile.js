module.exports = class Profile {
    id = ''
    name = ''
    directory_path = ''
    // 0 = No permission
    // 1 = Permission
    // Position grid definition

    // all permission
    // read data
    // update data
    // delete data
    // system settings
    // user, profile and permissions maintenance
    permission = []
    allowed_directories = [] // element ids
}
