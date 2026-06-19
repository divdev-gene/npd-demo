import { Pool, QueryResult } from "pg";

type QueryParams = (string | number | boolean | null)[];

const globalForVmsDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool() {
  const pool = new Pool({
  connectionString: process.env.VMS_DB,
  ssl: {
    rejectUnauthorized: false,
  },
});

  pool.on("connect", (client) => {
    client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  });

  return pool;
}

const pool = globalForVmsDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForVmsDb.pool = pool;

function assertReadOnly(sql: string) {
  const trimmed = sql.trimStart();
  const upper = trimmed.toUpperCase();
  if (
    !upper.startsWith("SELECT") &&
    !upper.startsWith("WITH") &&
    !(upper.startsWith("SET") && trimmed.toLowerCase().includes("read only"))
  ) {
    throw new Error(
      `VMS_DB is read-only. Rejected query: ${sql.slice(0, 80)}`
    );
  }
}

export async function query<T extends Record<string, unknown>>(
  sql: string,
  params: QueryParams = []
): Promise<T[]> {
  assertReadOnly(sql);
  const result: QueryResult<T> = await pool.query(sql, params);
  return result.rows;
}

export async function queryOne<T extends Record<string, unknown>>(
  sql: string,
  params: QueryParams = []
): Promise<T | null> {
  assertReadOnly(sql);
  const result: QueryResult<T> = await pool.query(sql, params);
  return result.rows[0] ?? null;
}
