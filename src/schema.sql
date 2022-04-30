CREATE TABLE IF NOT EXISTS member (
    id varchar(20) NOT NULL,
    guild_id varchar(20) NOT NULL,
    xp INTEGER UNSIGNED DEFAULT 0,
    PRIMARY KEY (
        id,
        guild_id
    )
);

CREATE TABLE IF NOT EXISTS settings (
    guild_id varchar(20) PRIMARY KEY,
    log_channel varchar(20)
);

CREATE TABLE IF NOT EXISTS reward (
    guild_id varchar(20) PRIMARY KEY,
    role_id varchar(20) NOT NULL,
    level INTEGER UNSIGNED NOT NULL
);

CREATE TABLE IF NOT EXISTS channel (
    channel_id varchar(20) PRIMARY KEY,
    guild_id varchar(20) NOT NULL,
    multiplier DECIMAL UNSIGNED,
    allow_commands BOOLEAN DEFAULT false
);
