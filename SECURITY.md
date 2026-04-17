# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| latest  | ✅ Yes             |
| older   | ❌ No              |

We only support the latest version on the `main` branch. Please ensure you are running the most recent release before reporting a vulnerability.

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/ScottSEA/main-menu/security) of this repository
2. Click **"Report a vulnerability"**
3. Fill out the advisory form with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

We will acknowledge your report within **48 hours** and aim to provide a fix or mitigation within **7 days** for critical issues.

## Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- Subscription gating bypasses (accessing menus without active subscription)
- SQL injection or other injection attacks
- Cross-site scripting (XSS) in rendered menus or the builder UI
- Unauthorized access to other users' restaurants, menus, or data
- Image upload vulnerabilities (path traversal, malicious files)
- Stripe webhook signature bypass
- Secrets or credentials exposed in code or logs

## Out of Scope

- Vulnerabilities in third-party dependencies (report these upstream; Dependabot monitors these for us)
- Rate limiting or brute force (not yet implemented)
- Issues that require physical access to the server

## Acknowledgments

We appreciate responsible disclosure and will credit reporters (with permission) in our release notes.
