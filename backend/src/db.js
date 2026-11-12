import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// La zona horaria de la sesión determina qué es "hoy" (CURRENT_DATE)
// para los repasos diarios, semanales, etc.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  options: `-c timezone=${config.timezone}`,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function initDb(retries = 20) {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const sql = await fs.readFile(path.join(dir, 'schema.sql'), 'utf8');

  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(sql);
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`Base de datos no disponible (intento ${attempt}/${retries}): ${err.message}`);
      await sleep(2000);
    }
  }
}
