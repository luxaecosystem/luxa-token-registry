// Builds tokens.json: one file the DEX/API can fetch, with absolute logo URLs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.config.json'), 'utf8'));
const dir = path.join(ROOT, 'tokens');

const tokens = fs.readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const t = JSON.parse(fs.readFileSync(path.join(dir, d.name, 'token.json'), 'utf8'));
    delete t.$schema;
    return { ...t, logo: `${cfg.rawBase}/${d.name}/${t.logo}` };
  })
  .sort((a, b) => a.symbol.localeCompare(b.symbol));

fs.writeFileSync(path.join(ROOT, 'tokens.json'), JSON.stringify({ chain_id: cfg.chainId, tokens }, null, 2) + '\n');
console.log(`tokens.json written with ${tokens.length} token(s).`);
