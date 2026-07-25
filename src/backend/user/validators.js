const _ = {}

_.isString = (value) => typeof value === 'string'

_.validateLogin = (body) => {
    if (!_.isString(body.username)) return false
    if (!_.isString(body.password)) return false
    return true
}

_.validateChangePassword = (body) => {
    if (!_.isString(body.old_password)) return false
    if (!_.isString(body.new_password)) return false
    return true
}

module.exports = _
