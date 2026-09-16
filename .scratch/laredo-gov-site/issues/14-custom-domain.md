# 14: Custom domain

**What to build:** The site answers at the owner's chosen domain over HTTPS. The owner buys the domain and points it at GitHub Pages; the repo carries the domain configuration.

**Blocked by:** 03 (Scheduled build and deploy on GitHub Pages)

**Status:** ready-for-human

- [x] Domain chosen, avoiding any name that implies official city endorsement
- [ ] DNS points at GitHub Pages; HTTPS enforced
- [x] Repo carries the domain configuration so a redeploy keeps it

## Comments

2026-09-16: Domain is insidelaredo.com (unregistered until today, no official-sounding words). Owner set the A records for the apex and a `www` CNAME at Cloudflare; both are proxied (orange cloud). Repo variables `SITE_DOMAIN` and `SITE_URL` are set, `BASE_PATH` removed, and the Pages custom domain is attached through the API, so every deploy writes `CNAME`. HTTPS: not enforced yet. GitHub cannot issue a certificate while Cloudflare proxies the records (API answers "The certificate does not exist yet"), and plain http:// serves the page without redirecting. Owner's choice: (a) in Cloudflare set SSL/TLS mode to Full and turn on Always Use HTTPS, or (b) set both records to DNS only (grey cloud), wait for GitHub to issue its certificate, then enforce HTTPS in Pages settings. The second checkbox closes when either is done.

2026-09-16 08:14Z: Owner took option (b). Both records are now DNS only: the apex resolves straight to the four GitHub Pages IPs and `www` is a CNAME to alavissolutions.github.io. The Pages health check reports both hosts valid, unproxied, served by Pages and HTTPS-eligible, with `https_error: peer_failed_verification`, meaning GitHub is still serving its `*.github.io` fallback certificate for insidelaredo.com. A 40-minute poll saw no certificate appear, and the Pages API still returns no `https_certificate` object. Likely cause: the domain was attached while Cloudflare was still proxying, so the first issuance attempt failed and GitHub has not retried. Next step for the owner: in the repo's Pages settings, remove the custom domain and add it back (or run the API detach/attach below), then wait for "Certificate issued" and tick Enforce HTTPS. Agent could not do this itself: the permission classifier blocks certificate and domain changes.

    gh api -X PUT repos/alavissolutions/laredogov/pages -f cname=
    gh api -X PUT repos/alavissolutions/laredogov/pages -f cname=insidelaredo.com
    # then, once the API shows https_certificate.state == "approved":
    gh api -X PUT repos/alavissolutions/laredogov/pages -F https_enforced=true
