# Listing a token

Anyone who created a CW20 token on LUXA (luxa-1) can submit its logo and info here.
**Only tokens that already have a liquidity pool with LUXA are accepted.**

## Steps

1. Fork this repo.
2. Create `tokens/<symbol in lowercase>/` (for example `tokens/mojo/`).
3. Copy `docs/example.token.json` to `tokens/<symbol>/token.json` and fill in every field.
4. Add `tokens/<symbol>/logo.png`.
5. Run `npm install && npm run validate` locally.
6. Open a pull request. The check must be green before a maintainer looks at it.

## Rules checked automatically

- The token contract exists on luxa-1 and was instantiated from the official CW20 code id.
- `symbol`, `name` and `decimals` match what the contract returns on chain.
- The pool contract is an official pair, contains your token and LUXA, and holds at least the minimum LUXA reserve (see `registry.config.json`).
- Logo: real PNG, square, 128-512 px, at most 100 KB. No SVG.
- Links must be `https://`. Description at most 280 characters.
- Symbols `LUXA`, `SHARD` and `SHARDS` are reserved. One contract can be listed only once.

## Rules checked by a human

- No impersonation of other projects or of LUXA itself, and no misleading names or logos.
- No offensive, illegal or copyrighted artwork.
- Description must not promise returns or profits.
- The submission should come from an account or channel linked to the project.

## Being listed is not an endorsement

A listing only means the metadata passed these checks. It is not financial advice and not a guarantee of
quality, safety or value. Always do your own research. A listing can be removed at any time, for example
if the pool is drained.
