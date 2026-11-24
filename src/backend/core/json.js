// =====================================================================================
// STATE.
// =====================================================================================

// Everything this file publishes.
const _ = {}

// =====================================================================================
// CLASS AND JSON CONVERSION.
//
//  Note: a model of this project keeps its fields private behind getters, so Object.keys()
//  over an instance answers the getters only when they are enumerable. Nothing in the backend
//  calls these three today; they are kept as the conversion helpers they were written to be.
// =====================================================================================

/**
 * Serialises the enumerable properties of an object into a JSON string.
 * @param {Object} class_object The instance to serialise.
 * @returns {String} The JSON text.
 */
_.classToJson = (class_object) => {
    // Copied key by key into a plain object first: JSON.stringify of an instance would answer
    //  {} whenever the fields are private.
    const json = {}
    for (const key of Object.keys(class_object)) json[key] = class_object[key]

    return JSON.stringify(json)
}

/**
 * Fills an instance with the values held in a JSON string.
 * @param {String} json The JSON text to read.
 * @param {Object} class_object The instance to write into. Its setters do the assigning.
 * @returns {Object} The same instance, filled in.
 */
_.jsonToClass = (json, class_object) => {
    // Parsed once, then copied key by key through the setters.
    const parsed = JSON.parse(json)
    for (const key of Object.keys(parsed)) class_object[key] = parsed[key]

    return class_object
}

/**
 * Fills an instance with the values held in a plain object.
 * @param {Object} object_literal The object to read.
 * @param {Object} class_object The instance to write into. Its setters do the assigning.
 * @returns {Object} The same instance, filled in.
 */
_.setClassFromObjectLiteral = (object_literal, class_object) => {
    // Copied key by key through the setters.
    for (const key of Object.keys(object_literal)) class_object[key] = object_literal[key]

    return class_object
}

module.exports = _
