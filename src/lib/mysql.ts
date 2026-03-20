import mysql from "mysql2/promise";

let pool: mysql.Pool | undefined;
let creating: Promise<mysql.Pool> | undefined;

/** Backtick-wrap identifier for CREATE DATABASE (supports names like vibe-coding-project). */
function escapeMysqlIdent(name: string): string {
  return "`" + name.replace(/`/g, "``") + "`";
}

/**
 * Try to create the database if missing. Requires CREATE privilege on the server.
 * If this fails (common for restricted app users), create the DB manually — see scripts/mysql-init.sql.
 */
async function ensureDatabaseExists(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
): Promise<void> {
  if (process.env.MYSQL_SKIP_AUTOCREATE_DB === "1") return;
  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: false,
    });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeMysqlIdent(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[mysql] Auto CREATE DATABASE skipped or denied (create DB manually if needed):",
        e instanceof Error ? e.message : e,
      );
    }
  } finally {
    await conn?.end().catch(() => undefined);
  }
}

async function ensureSchema(p: mysql.Pool): Promise<void> {
  await p.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      created_at VARCHAR(64) NOT NULL,
      original_filename VARCHAR(512) NOT NULL,
      audio_relative_path VARCHAR(512) NOT NULL,
      transcript_json LONGTEXT NOT NULL,
      analysis_json LONGTEXT NOT NULL,
      KEY idx_calls_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getPool(): Promise<mysql.Pool> {
  if (pool) return pool;
  if (!creating) {
    creating = (async () => {
      const host = process.env.MYSQL_HOST?.trim() || "localhost";
      const user = process.env.MYSQL_USER?.trim();
      const password = process.env.MYSQL_PASSWORD ?? "";
      const database = process.env.MYSQL_DATABASE?.trim();
      const port = Number(process.env.MYSQL_PORT || "3306");
      if (!user || !database) {
        throw new Error(
          "Set MYSQL_USER and MYSQL_DATABASE in .env.local (see .env.example).",
        );
      }

      await ensureDatabaseExists(host, port, user, password, database);

      const p = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        enableKeepAlive: true,
      });
      await ensureSchema(p);
      pool = p;
      return p;
    })();
  }
  return creating;
}
