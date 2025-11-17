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

// ================================
// Types verbose gets.

_.GetRelationTypeWildcard = () => _.RelationTypes[0]
_.GetRelationTypeTest = () => _.RelationTypes[1]
_.GetRelationTypeTagAntecedentAndConsequent = () => _.RelationTypes[2]

_.GetTableWildcard = () => _.Tables[0]
_.GetTableRelation = () => _.Tables[1]
_.GetTableUser = () => _.Tables[2]
_.GetTableSettings = () => _.Tables[3]
_.GetTableItem = () => _.Tables[4]
_.GetTableProfile = () => _.Tables[5]

_.GetApiGetFilterById1 = () => _.APIGetFilters[0]
_.GetApiGetFilterById1AndId2 = () => _.APIGetFilters[1]
_.GetApiGetFilterByTable1 = () => _.APIGetFilters[2]
_.GetApiGetFilterByTable1AndTable2 = () => _.APIGetFilters[3]
_.GetApiGetFilterByRelationType = () => _.APIGetFilters[4]

module.exports = _
