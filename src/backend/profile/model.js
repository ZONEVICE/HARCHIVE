module.exports = class Profile {
    id = ''
    name = ''
    directory_path = ''
    // todo: analyze this to be less ambiguous and more scalable.
    // Permission level definition
    // 0 = No permission
    // 1 = Permission
    // Position grid definition

    // all permission
    // read data
    // update data
    // delete data
    // system settings
    permission = []
    allowed_directories = [] // element ids
}
