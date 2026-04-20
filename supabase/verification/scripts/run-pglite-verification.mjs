import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { PGlite } from '@electric-sql/pglite';

function parseArgs(argv) {
  const files = [];
  let query = null;
  let cwd = process.cwd();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--query') {
      query = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--cwd') {
      cwd = path.resolve(argv[index + 1] ?? cwd);
      index += 1;
      continue;
    }

    files.push(arg);
  }

  if (files.length === 0) {
    throw new Error('At least one SQL file is required.');
  }

  return { cwd, files, query };
}

const { cwd, files, query } = parseArgs(process.argv.slice(2));
const db = new PGlite();

try {
  for (const file of files) {
    const resolvedPath = path.resolve(cwd, file);
    const sql = await fs.readFile(resolvedPath, 'utf8');

    try {
      await db.exec(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed executing ${file}: ${message}`);
    }
  }

  if (query) {
    const result = await db.query(query);
    process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`);
  }
} finally {
  await db.close();
}
