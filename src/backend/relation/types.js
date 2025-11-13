const _ = {}

_.RelationTypes = [
    'wildcard',
    'test',
    'tag_antecedent_and_consequent',
]

_.Tables = [
    'WILDCARD',
    'RELATION',
    'USER',
    'SETTINGS',
    'ITEM',
    'PROFILE',
]

_.APIGetFilters = [
    'by_id_1',
    'by_id_1_and_id_2',
    'by_table_1',
    'by_table_1_and_table_2',
    'by_relation_type',
]

module.exports = _
