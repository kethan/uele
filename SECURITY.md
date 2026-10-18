# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.11.x  | ✅        |
| < 0.11  | ❌        |

Only the latest minor release receives security fixes.

## Reporting a Vulnerability

Please do **not** open a public issue for security problems.

- Preferred: use GitHub's private vulnerability reporting — **Report a
  vulnerability** under the repository's
  [Security tab](https://github.com/kethan/uele/security/advisories/new).
- You can expect an acknowledgement within 72 hours and a status update
  within 7 days. If a report is accepted, the fix ships as a patch release
  and is credited in the changelog (unless you prefer to stay anonymous).

## Scope Notes

uele is a client-side rendering library. As with any DOM library:

- Never feed untrusted strings into HTML. uele writes text and attributes;
  if your own code injects markup (for example via `innerHTML`),
  sanitizing that markup is your responsibility.
- Signal libraries and diff engines are optional peer dependencies —
  audit the ones you install.
- Reports about a peer dependency's own vulnerabilities are best filed
  with that project; we will bump the peer range here when a fix exists.
