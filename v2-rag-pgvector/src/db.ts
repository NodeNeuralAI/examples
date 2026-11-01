import pg from 'pg';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const db = {
  async transaction<T>(fn: (tx: pg.PoolClient) => Promise<T>): Promise<T> {
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      const result = await fn(tx);
      await tx.query('COMMIT');
      return result;
    } catch (err) {
      await tx.query('ROLLBACK');
      throw err;
    } finally {
      tx.release();
    }
  },
  query: pool.query.bind(pool),
};

// RLS reads the tenant from this setting; `true` scopes it to the current transaction only.
export const setTenant = (tx: pg.PoolClient, tenantId: string) =>
  tx.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
