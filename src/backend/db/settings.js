const _ = {}

_.CREATE_TABLE = `
CREATE TABLE "SETTINGS" (
    "id"	INTEGER NOT NULL,
    "allow_downloads"	INTEGER NOT NULL,
    "allow_file_system_browser"	INTEGER NOT NULL,
    PRIMARY KEY("id" AUTOINCREMENT)
)`;

_.SELECT_ALL = 'SELECT * FROM SETTINGS';

_.INSERT_DEFAULT_RECORD = `
INSERT INTO SETTINGS 
(allow_downloads, allow_file_system_browser) 
VALUES (1,1);`

module.exports = _
