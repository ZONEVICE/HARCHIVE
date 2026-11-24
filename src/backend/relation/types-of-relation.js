// =====================================================================================
// THE RELATION TYPE CATALOGUE.
//
//  The fixed list of verbs a relation may carry. relation_type says what the link between
//  entity_1 (id_1) and entity_2 (id_2) means, and it never encodes which tables are joined —
//  that is the other axis, the two (id, entity) pairs — so this catalogue does not grow with
//  the number of entities.
//
//  A type carries logical weight: code that reads a relation as meaning something must filter
//  by the exact type it means, or every other type becomes a second, quieter way to obtain
//  the same effect. Keep this comment block in step with the array below.
//
//  - contains : directional. entity_1 (id_1) CONTAINS entity_2 (id_2). Which directory is
//               inside which, or a file that lives inside a directory. The parent is id_1.
//  - sibling  : symmetric. Both sides share a parent and sit at the same level.
//  - linked   : symmetric, generic association with no containment meaning. It is also what
//               grants a permission to a user, and permission/service reads only this type.
//  - tagged   : directional. entity_1 (id_1) is TAGGED WITH the tag entity_2 (id_2). The tag
//               is always id_2.
//  - implies  : directional, tag to tag. The antecedent (id_1) implies the consequent (id_2),
//               Danbooru style, used to expand a search: "cat" implies "animal".
// =====================================================================================

// Everything this file publishes.
const _ = {}

// The catalogue itself. Membership is what matters, never the order: a stored row holds the
//  verb, so the list may be re-sorted without reinterpreting anything.
_.RELATION_TYPES = ['contains', 'sibling', 'linked', 'tagged', 'implies']

module.exports = _
