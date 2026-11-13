# Faultline Companion — Site App

The site-side half of Faultline's two-app architecture. Forge forbids mixing
workspace-classified scopes (Bitbucket) with site-classified scopes
(`search:confluence`) in one app, so the Confluence postmortem search lives here
and is exposed to the main (Bitbucket) app as an authenticated HTTP endpoint.

## How the pair works

1. The main app (Bitbucket workspace) analyzes pull requests.
2. When it needs postmortem evidence, it POSTs the changed file paths to this
   app's webtrigger with the shared bearer token.
3. This app runs the tested CQL search against the site's Confluence and
   returns the status envelope (`{ status, reason, byPath }`) — including the
   fetch-failure-vs-absence distinction.
4. The main app threads the envelope into the same evidence tier it always had.

The CQL construction and response mapping are shared with the main app
(`../faultline/src/risk/cql.js` — copied here verbatim, byte-identical).

## Setup

```bash
npm install -g @forge/cli   # if not already
npm install
forge register              # app name suggestion: faultline-site
# paste the printed app id into manifest.yml
forge deploy
forge install --product Jira --site https://faultline1.atlassian.net --environment development
forge variables set FAULTLINE_ENDPOINT_TOKEN "<same secret as the main app>"
forge webtrigger create --functionKey postmortem-search --product Jira --site https://faultline1.atlassian.net
```

Then in the MAIN app:
```bash
forge variables set FAULTLINE_SITE_APP_URL "<the webtrigger URL printed above>"
forge variables set FAULTLINE_ENDPOINT_TOKEN "<the same secret>"
forge deploy
```

## Request / response contract

POST (Authorization: Bearer `<FAULTLINE_ENDPOINT_TOKEN>`):
```json
{ "paths": ["src/payments/retry.js", "src/auth/session.ts"] }
```
Response (200):
```json
{
  "status": "ok",
  "reason": null,
  "byPath": {
    "src/payments/retry.js": {
      "count": 2,
      "refs": [{ "title": "Postmortem: Checkout outage", "url": "https://…/wiki/spaces/…" }]
    }
  }
}
```
When every lookup fails, `status: "unavailable"` with the reason — the caller
renders it as a fetch-failure warning, never as "no incident history."
