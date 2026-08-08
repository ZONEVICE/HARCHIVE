const _ = {}

_.classToJson = class_object => {
    const json = {};
    for (const key of Object.keys(class_object)) json[key] = class_object[key];
    return JSON.stringify(json);
}

_.jsonToClass = (json, class_object) => {
    const _json = JSON.parse(json);
    for (const key of Object.keys(_json))
        class_object[key] = _json[key];
    return class_object
}

_.setClassFromObjectLiteral = (object_literal, class_object) => {
    for (const key of Object.keys(object_literal))
        class_object[key] = object_literal[key];
    return class_object
}

module.exports = _
