SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS film (
    FILM_ID bigint NOT NULL PRIMARY KEY,
    FILNAMN varchar(256),
    FILM_OBJ_FIL varchar(256),
    OBJTYP varchar(8),
    DATUM varchar(256),
    DOKTITEL varchar(2256),
    FILM_T_ID bigint DEFAULT 1,
    FILM_OPLATS varchar(64),
    FILM_O_ID bigint DEFAULT 1,
    FILM_U_E_ID bigint DEFAULT 0,
    FILM_U_ID bigint DEFAULT 1,
    KOMMENT_FILM varchar(4000),
    FILM_MIME_TYPE varchar(50),
    ASV varchar(20),
    NODEID bigint,
    OPTIONS_ bigint DEFAULT 0,
    DELETEDDATE date
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
