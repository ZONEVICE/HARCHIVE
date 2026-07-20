// --------------------------------------------------------------------------------
// Fixed catalogue of relation types. The "relation_type" of a relation disambiguates
// what kind of link exists between entity_1 (id_1) and entity_2 (id_2).
//
// - contains : directional. entity_1 (id_1) CONTAINS entity_2 (id_2).
//              Use it to express which directory is inside another directory, or a
//              file that lives inside a directory. The parent is always id_1.
// - sibling  : symmetric. Both entities share the same parent and sit at the same level.
// - linked   : generic, non-hierarchical association with no containment meaning.
// - tagged   : directional. entity_1 (id_1) is TAGGED WITH the tag entity_2 (id_2).
//              Use it to attach a tag to a file or directory. The tag is always id_2.
// - implies  : directional, tag-to-tag. The antecedent tag entity_1 (id_1) IMPLIES the
//              consequent tag entity_2 (id_2) (Danbooru style). Used to expand searches:
//              e.g. "cat" implies "animal". Both sides are always tags.
// --------------------------------------------------------------------------------

const _ = {}

_.RELATION_TYPES = ['contains', 'sibling', 'linked', 'tagged', 'implies']

module.exports = _
