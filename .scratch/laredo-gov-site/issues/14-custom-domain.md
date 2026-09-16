# 14: Custom domain

**What to build:** The site answers at the owner's chosen domain over HTTPS. The owner buys the domain and points it at GitHub Pages; the repo carries the domain configuration.

**Blocked by:** 03 (Scheduled build and deploy on GitHub Pages)

**Status:** ready-for-human

- [x] Domain chosen, avoiding any name that implies official city endorsement
- [ ] DNS points at GitHub Pages; HTTPS enforced
- [x] Repo carries the domain configuration so a redeploy keeps it

## Comments

2026-09-16: Domain is insidelaredo.com (unregistered until today, no official-sounding words). Owner set the A records for the apex and a `www` CNAME at Cloudflare; both are proxied (orange cloud). Repo variables `SITE_DOMAIN` and `SITE_URL` are set, `BASE_PATH` removed, and the Pages custom domain is attached through the API, so every deploy writes `CNAME`. HTTPS: see the note below once verified.
