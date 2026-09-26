-- Himig — MySQL/MariaDB schema for phpMyAdmin.
--
-- Import: in phpMyAdmin, FIRST select your database in the left sidebar
-- (e.g. jimque5_pinay_singer), THEN Import > choose this file > Go.
-- Tables are created inside whichever database is selected, so this also works
-- on shared hosting where CREATE DATABASE is not permitted.
-- Mirrors the app's real data model (src/context/AppContext.js, src/data/*.js).


-- ---------------------------------------------------------------- users
-- Profile tab. Favorites and user-added artists belong to a user.
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(32)  NOT NULL,
  `display_name`  VARCHAR(64)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------- artists
-- `owner_id` NULL = curated/seeded artist (shown to everyone).
-- `owner_id` set = user-created (the app's `custom: true`).
CREATE TABLE IF NOT EXISTS `artists` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   INT UNSIGNED NULL,
  `name`       VARCHAR(80)  NOT NULL,
  `tagline`    VARCHAR(120) NOT NULL DEFAULT 'OPM artist',
  `era`        VARCHAR(40)  NOT NULL DEFAULT 'Since —',
  `genre`      VARCHAR(60)  NOT NULL DEFAULT 'OPM',
  `bio`        TEXT         NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_artist_per_owner` (`owner_id`, `name`),
  KEY `ix_artists_name` (`name`),
  CONSTRAINT `fk_artists_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------- songs
-- The `songs: []` array on an artist. `position` keeps the app's order.
CREATE TABLE IF NOT EXISTS `songs` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `artist_id` INT UNSIGNED NOT NULL,
  `title`     VARCHAR(150) NOT NULL,
  `position`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_song_per_artist` (`artist_id`, `title`),
  KEY `ix_songs_order` (`artist_id`, `position`),
  CONSTRAINT `fk_songs_artist` FOREIGN KEY (`artist_id`) REFERENCES `artists` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------ favorites
-- Replaces the per-artist `favorite` boolean; a favorite is per user.
CREATE TABLE IF NOT EXISTS `favorites` (
  `user_id`    INT UNSIGNED NOT NULL,
  `artist_id`  INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `artist_id`),
  KEY `ix_favorites_artist` (`artist_id`),
  CONSTRAINT `fk_fav_user`   FOREIGN KEY (`user_id`)   REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fav_artist` FOREIGN KEY (`artist_id`) REFERENCES `artists` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------- tracks
-- Server-side copy of the offline caches in src/data/storage.js
-- (@himig/home_cache, @himig/trending_cache) — one row per iTunes track.
CREATE TABLE IF NOT EXISTS `tracks` (
  `itunes_id`   BIGINT UNSIGNED NOT NULL,
  `feed`        ENUM('home','trending') NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `artist_name` VARCHAR(120) NOT NULL,
  `album`       VARCHAR(200) NULL,
  `artwork_url` VARCHAR(255) NULL,
  `preview_url` VARCHAR(255) NOT NULL,
  `fetched_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`itunes_id`, `feed`),
  KEY `ix_tracks_feed` (`feed`, `fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================ seed data
-- Demo login: username `opmfan`, password `opmfan123`
INSERT INTO `users` (`id`, `username`, `display_name`, `password_hash`) VALUES
  (1, 'opmfan', 'OPM Fan', '$2y$10$iHDVeKZQuPTaMzS95GOUduwcaFE5qiMEveIql5EGqbCxraHIvUKFa')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

INSERT INTO `artists` (`id`, `owner_id`, `name`, `tagline`, `era`, `genre`, `bio`) VALUES
  (1, NULL, 'Regine Velasquez',   "Asia's Songbird",          'Since 1986', 'Pop, Ballad',  'Belting powerhouse widely credited with setting the standard for OPM vocal performance.'),
  (2, NULL, 'Sarah Geronimo',     'Popstar Royalty',          'Since 2003', 'Pop, R&B',     'Won Star for a Night as a teenager and has headlined OPM pop ever since.'),
  (3, NULL, 'Moira Dela Torre',   'Balladeer of a generation','Since 2016', 'Folk-pop',     'Known for airy, confessional ballads and film soundtrack hits.'),
  (4, NULL, 'KZ Tandingan',       'Queen of Soul Supreme',    'Since 2012', 'Soul, R&B',    'Rapper-singer who broke through on Chinese singing competition Singer 2018.'),
  (5, NULL, 'Morissette',         'Asia\'s Phoenix',          'Since 2013', 'Pop, Ballad',  'Wide-range vocalist known for whistle notes and live covers.'),
  (6, NULL, 'Kyla',               'R&B Queen of the PH',      'Since 1999', 'R&B',          'Defined Filipino R&B through the 2000s.'),
  (7, NULL, 'Yeng Constantino',   'Pop Rock Princess',        'Since 2006', 'Pop rock',     'Pinoy Dream Academy winner and songwriter of most of her hits.'),
  (8, NULL, 'Julie Anne San Jose','Asia\'s Pop Sweetheart',   'Since 2011', 'Pop, R&B',     'Singer-songwriter and multi-instrumentalist.')
ON DUPLICATE KEY UPDATE `tagline` = VALUES(`tagline`);

INSERT INTO `songs` (`artist_id`, `title`, `position`) VALUES
  (1, 'Dadalhin', 0), (1, 'You Are My Song', 1), (1, 'Pangako', 2),
  (2, 'Tala', 0), (2, 'Kilometro', 1), (2, 'Forever\'s Not Enough', 2),
  (3, 'Tagpuan', 0), (3, 'Malaya', 1), (3, 'Paubaya', 2),
  (4, 'Two Less Lonely People in the World', 0), (4, 'Labo', 1), (4, 'Mahal Ko o Mahal Ako', 2),
  (5, 'Akin Ka Na Lang', 0), (5, 'Di Na Muli', 1), (5, 'Phoenix', 2),
  (6, 'Hanggang Ngayon', 0), (6, 'Beautiful Girl', 1), (6, 'Not Your Woman', 2),
  (7, 'Hawak Kamay', 0), (7, 'Salamat', 1), (7, 'Ikaw', 2),
  (8, 'Tayo', 0), (8, 'I\'ll Be There', 1), (8, 'Sa\'yo', 2)
ON DUPLICATE KEY UPDATE `position` = VALUES(`position`);

INSERT INTO `favorites` (`user_id`, `artist_id`) VALUES (1, 1), (1, 3)
ON DUPLICATE KEY UPDATE `created_at` = `created_at`;
