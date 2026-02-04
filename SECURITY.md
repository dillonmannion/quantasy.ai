# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

We recommend always running the latest version to ensure you have the most recent security patches.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### Preferred: GitHub Private Vulnerability Reporting

1. Navigate to the **Security** tab of this repository
2. Click **Report a vulnerability**
3. Fill out the form with detailed information
4. Submit the report

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

## Response Timeline

| Timeline | Action |
|----------|--------|
| 48 hours | Acknowledgment of report |
| 7 days | Initial assessment |
| 30 days | Fix for critical/high severity |

We will keep you informed throughout the process and credit you as the discoverer unless you prefer anonymity.

## Disclosure Policy

We follow coordinated disclosure:

1. Report privately
2. We investigate and develop a fix
3. We coordinate a disclosure date with you
4. Public advisory published with credit

### What We Ask

- Do not publicly disclose until we've addressed the issue
- Do not access or modify other users' data
- Act in good faith

### Out of Scope

- Clickjacking on pages without sensitive actions
- CSRF on login/logout
- Missing security headers without demonstrated exploit
- Denial of Service attacks
- Social engineering
- Issues in third-party dependencies (report to respective maintainers)

## Security Measures

This application implements:

- **Authentication**: Supabase Auth with secure session management
- **Data Encryption**: TLS for all data in transit
- **Rate Limiting**: API protection (Sleeper: 16 req/sec, AI: 30 req/min)
- **Input Validation**: Server-side validation on all inputs
- **CSP Headers**: Content Security Policy against XSS
- **Dependency Scanning**: Dependabot for automated vulnerability detection
- **Error Monitoring**: Sentry with PII stripping

---

Thank you for helping keep Quantasy secure.
