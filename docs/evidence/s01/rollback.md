# S01 rollback steps

None of these steps was executed in S01; they restore the state recorded in
[dns-before.json](dns-before.json). Load the credentials first, in the same shell, and never
echo them: `set -a; . ~/.config/qrwty/cloudflare.env; set +a`.

## What S01 changed

| Thing | Before S01 | After S01 |
| --- | --- | --- |
| Workers Custom Domain `qrwty.io` | Worker `qrwty-platform`, environment `production` | Worker `qrwty-edge` |
| Workers Custom Domain `www.qrwty.io` | none (the name did not resolve) | Worker `qrwty-edge` |
| DNS `qrwty.io AAAA 100::`, proxied, TTL auto | managed (read-only) by the `qrwty.io` Custom Domain | same record, still managed by that Custom Domain |
| DNS `www.qrwty.io AAAA 100::`, proxied, TTL auto | none | created by Cloudflare for the `www` Custom Domain |
| Worker `qrwty-edge` | none | created by `deploy.sh` |
| Worker `qrwty-platform` | deployed | unchanged (not edited, not deleted) |
| MX, TXT, CAA and any other records | none existed | none |
| Zone settings (SSL full, Always Use HTTPS off, HSTS off, min TLS 1.0, Automatic HTTPS Rewrites on) | as listed | unchanged |

What `https://qrwty.io/` served before S01 (fetched 2026-11-14T22:52:25Z): `200`,
`content-type: text/html`, title `Qrwty | Beautiful, Ownable QR Infrastructure`, 11,694 bytes,
SHA-256 `b146e8545b730924b5f6a5b32d3c39fdeb465b37ab254bf0b4f4bcbe7eb86bd6`, from the
`qrwty-platform` Worker (it also loads `/styles.css` and Google Fonts).

## 1. Roll the placeholder back to an earlier version (keeps the hostnames)

```sh
cd deploy/cloudflare
pnpm exec wrangler deployments list     # versions, newest first
pnpm exec wrangler rollback <version-id>
```

Versions deployed in S01 are listed in [deploy-output.txt](deploy-output.txt). Rollback is
available on the Free plan.

## 2. Restore what qrwty.io served before S01

Dashboard (Workers & Pages):

1. Worker **qrwty-edge** → Settings → Domains & Routes: remove `qrwty.io` and `www.qrwty.io`.
   Removing a Custom Domain removes its managed DNS record; `www.qrwty.io` then stops resolving,
   as before S01.
2. Worker **qrwty-platform** → Settings → Domains & Routes → Add → Custom domain → `qrwty.io`.
   Cloudflare recreates the managed `AAAA 100::` proxied record and the certificate.
3. Check: `curl -sS https://qrwty.io/ | grep -o '<title>[^<]*</title>'` shows
   `Qrwty | Beautiful, Ownable QR Infrastructure`.
4. Optional: delete the placeholder Worker with `cd deploy/cloudflare && pnpm exec wrangler
   delete qrwty-edge`. Later units redeploy it with `deploy.sh`.

API equivalent (untested in S01): `GET /accounts/{account}/workers/domains` lists the Custom
Domains with their IDs; `DELETE /accounts/{account}/workers/domains/{id}` removes one;
`PUT /accounts/{account}/workers/domains` with
`{"hostname":"qrwty.io","service":"qrwty-platform","environment":"production","zone_id":"<qrwty.io zone ID>"}`
attaches `qrwty.io` to `qrwty-platform` again. Send the token as a header read from stdin (for
example `printf 'Authorization: Bearer %s\n' "$CLOUDFLARE_API_TOKEN" | curl -H @- ...`), never as
an argument.

No other DNS record or zone setting needs restoring.
