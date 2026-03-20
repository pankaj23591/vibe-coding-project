-- Run as MySQL root (or admin) once if the database does not exist yet.
CREATE DATABASE IF NOT EXISTS `vibe-coding-project`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Example: grant app user access (adjust password and host as needed).
-- GRANT ALL PRIVILEGES ON `vibe-coding-project`.* TO 'storeprocraftcabinetry'@'localhost' IDENTIFIED BY 'your_password';
-- FLUSH PRIVILEGES;

-- Table `calls` is created automatically on first app request (see src/lib/mysql.ts).
