/**
 * MySQL connection pool — FAMtastic Hosting
 *
 * Replaces the Supabase client with a mysql2/promise connection pool.
 * Three exports:
 *   pool            — the raw mysql2 Pool (use for .getConnection() etc.)
 *   query()         — shorthand: pool.execute(sql, params) → [rows, fields]
 *   getConnection() — acquire a PoolConnection for manual transaction control
 *   withTransaction(fn) — BEGIN/COMMIT/ROLLBACK wrapper
 *
 * Environment variables (read lazily on first pool access, not at import time):
 *   MYSQL_HOST
 *   MYSQL_PORT       (defaults to 3306)
 *   MYSQL_DATABASE
 *   MYSQL_USER
 *   MYSQL_PASSWORD
 */

import mysql from 'mysql2/promise';

// ─── Lazy pool initialization ─────────────────────────────────────────────────
// Astro's static-prerender phase imports this module but doesn't need MySQL.
// Eagerly calling mysql.createPool() with missing env vars would crash the build.
// So we defer pool creation until first actual use.

let _pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!_pool) {
    const env = (key: string): string => {
      const value = process.env[key];
      if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
      }
      return value;
    };

    _pool = mysql.createPool({
      host: env('MYSQL_HOST'),
      port: Number(process.env.MYSQL_PORT) || 3306,
      database: env('MYSQL_DATABASE'),
      user: env('MYSQL_USER'),
      password: env('MYSQL_PASSWORD'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+00:00', // store all timestamps in UTC
    });
  }
  return _pool;
}

/** The raw mysql2 Pool. Lazily created on first access. */
export const pool = new Proxy({} as mysql.Pool, {
  get(_target, prop, _receiver) {
    return Reflect.get(getPool(), prop);
  },
});

// ─── Query helper ─────────────────────────────────────────────────────────────

/**
 * Execute a parameterised SQL statement.
 *
 * Usage:
 *   const [rows] = await query('SELECT * FROM users WHERE id = ?', [1]);
 *   // rows is typed as RowDataPacket[] by mysql2
 */
export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: mysql.QueryParams,
): Promise<[T, mysql.FieldPacket[]]> {
  return getPool().execute<T>(sql, params);
}

// ─── Transaction helper ──────────────────────────────────────────────────────

/**
 * Acquire a connection from the pool. Caller is responsible for
 * calling connection.release() when done.
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  return getPool().getConnection();
}

/**
 * Run `fn` inside a transaction. Acquires a connection, BEGINs, calls fn,
 * COMMITs on success, ROLLBACKs on error, and always releases the connection.
 *
 * Usage:
 *   const result = await withTransaction(async (conn) => {
 *     await conn.execute('INSERT INTO users ...', [...]);
 *     await conn.execute('INSERT INTO orders ...', [...]);
 *     return 'ok';
 *   });
 */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}