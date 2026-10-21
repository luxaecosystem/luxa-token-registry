// Validates every tokens/<symbol>/ entry against the schema AND against the live luxa-1 chain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.config.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schema/token.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const checkSchema = ajv.compile(schema);

const errors = [];
const fail = (who, msg) => errors.push(`[${who}] ${msg}`);

async function rest(p) {
  const r = await fetch(cfg.rest + p, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`REST ${r.status} on ${p}`);
  return r.json();
}
async function smart(contract, msg) {
  const b64 = Buffer.from(JSON.stringify(msg)).toString('base64');
  const d = await rest(`/cosmwasm/wasm/v1/contract/${contract}/smart/${encodeURIComponent(b64)}`);
  return d.data;
}

function checkLogo(who, dir, t) {
  const p = path.join(dir, t.logo);
  if (!fs.existsSync(p)) return fail(who, 'logo.png is missing');
  const buf = fs.readFileSync(p);
  const isPng = buf.length >= 24 && buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPng || buf.subarray(12, 16).toString('ascii') !== 'IHDR') return fail(who, 'logo must be a real PNG file');
  if (buf.length > cfg.maxLogoBytes) fail(who, `logo is ${buf.length} bytes, max ${cfg.maxLogoBytes}`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width !== height) fail(who, `logo must be square (got ${width}x${height})`);
  if (width < 128 || width > 512) fail(who, `logo must be between 128 and 512 px (got ${width})`);
}

async function checkChain(who, t) {
  const ni = await rest('/cosmos/base/tendermint/v1beta1/node_info');
  if (ni.default_node_info?.network !== cfg.chainId) {
    return fail(who, `node reports network "${ni.default_node_info?.network}", expected ${cfg.chainId}`);
  }

  const c = (await rest(`/cosmwasm/wasm/v1/contract/${t.contract}`)).contract_info;
  if (Number(c.code_id) !== cfg.cw20CodeId) fail(who, `token contract uses code_id ${c.code_id}, expected ${cfg.cw20CodeId}`);

  const ti = await smart(t.contract, { token_info: {} });
  if (ti.symbol !== t.symbol) fail(who, `symbol on chain is "${ti.symbol}", file says "${t.symbol}"`);
  if (ti.name !== t.name) fail(who, `name on chain is "${ti.name}", file says "${t.name}"`);
  if (ti.decimals !== t.decimals) fail(who, `decimals on chain is ${ti.decimals}, file says ${t.decimals}`);

  const pc = (await rest(`/cosmwasm/wasm/v1/contract/${t.pool.contract}`)).contract_info;
  if (Number(pc.code_id) !== cfg.pairCodeId) fail(who, `pool uses code_id ${pc.code_id}, expected ${cfg.pairCodeId}`);

  // Query pair_info on luxa-1 AMM pair contract: { token_a, token_b, reserve_a, reserve_b, total_lp_supply }
  const pool = await smart(t.pool.contract, { pair_info: {} });
  const isTokenA = pool.token_a === t.contract;
  const isTokenB = pool.token_b === t.contract;
  const isQuoteA = pool.token_a === cfg.quoteDenom;
  const isQuoteB = pool.token_b === cfg.quoteDenom;

  if (!isTokenA && !isTokenB) {
    fail(who, `pool does not contain token ${t.contract} (found ${pool.token_a} / ${pool.token_b})`);
  }
  if (!isQuoteA && !isQuoteB) {
    fail(who, `pool is not paired with ${cfg.quoteDenom} (found ${pool.token_a} / ${pool.token_b})`);
  }

  const quoteReserve = isQuoteA ? pool.reserve_a : isQuoteB ? pool.reserve_b : '0';
  if ((isQuoteA || isQuoteB) && BigInt(quoteReserve || '0') < BigInt(cfg.minQuoteReserveMicro)) {
    fail(who, `pool holds ${quoteReserve} ${cfg.quoteDenom}, minimum is ${cfg.minQuoteReserveMicro}`);
  }
}

const tokensDir = path.join(ROOT, 'tokens');
const dirs = fs.readdirSync(tokensDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const contracts = new Map();

for (const name of dirs) {
  const dir = path.join(tokensDir, name);
  const file = path.join(dir, 'token.json');
  if (!fs.existsSync(file)) { fail(name, 'token.json is missing'); continue; }

  let t;
  try { t = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(name, 'token.json is not valid JSON'); continue; }
  if (!checkSchema(t)) {
    for (const e of checkSchema.errors) fail(name, `schema: ${e.instancePath || '/'} ${e.message}`);
    continue;
  }

  if (name !== t.symbol.toLowerCase()) fail(name, `folder must be named "${t.symbol.toLowerCase()}"`);
  if (cfg.reservedSymbols.includes(t.symbol)) fail(name, `symbol ${t.symbol} is reserved`);
  if (contracts.has(t.contract)) fail(name, `contract already listed in "${contracts.get(t.contract)}"`);
  contracts.set(t.contract, name);

  checkLogo(name, dir, t);
  try { await checkChain(name, t); } catch (e) { fail(name, `chain check failed: ${e.message}`); }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`OK: ${dirs.length} token(s) validated.`);