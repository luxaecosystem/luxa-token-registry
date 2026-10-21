# LUXA Token Registry

Logos and metadata for tokens on the LUXA Network (`luxa-1`).

```
tokens/<symbol>/token.json   token info and pool address
tokens/<symbol>/logo.png     square PNG logo
tokens.json                  generated index (npm run build)
```

Native chain assets (`uluxa`, `ushard`) are described in the chain registries and are not listed here.

## For token creators

Read [CONTRIBUTING.md](CONTRIBUTING.md). Only tokens with a LUXA pool can be listed.

## For apps and the DEX

- Fetch `tokens.json` (or a single `token.json`) and use it for logos, names and links.
- Treat the chain as the source of truth for pools, reserves, supply and decimals.
- Suggested rule for a "verified" badge: the token has an entry here AND its pool exists on chain now.
- Tokens that are not listed here can still be imported by contract address, with an unverified warning.

## Local checks

```
npm install
npm run validate
npm run build
```

License: Apache-2.0.
