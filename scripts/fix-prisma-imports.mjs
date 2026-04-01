// Fixes extensionless relative imports in Prisma-generated JS files for Node ESM
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const dir = 'apps/api/dist/generated/prisma';

function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith('.js')) continue;
    let code = readFileSync(p, 'utf8');
    // Add .js to relative imports missing extensions
    const fixed = code.replace(
      /from\s+["'](\.\.?\/[^"']+?)(?<!\.js)["']/g,
      (_, path) => `from "${path}.js"`
    );
    if (fixed !== code) writeFileSync(p, fixed);
  }
}

walk(dir);
console.log('Fixed Prisma ESM imports');
