# Security Policy

## Supported deployment

The production application is available at:

https://jobs.affan.tech

## Reporting a vulnerability

Please do not publish security vulnerabilities, credentials, tokens or exploit details in a public GitHub issue.

Use the repository owner's GitHub profile or repository contact mechanisms to report the issue privately. Include:

- A clear description of the vulnerability
- Affected route, component or workflow
- Reproduction steps
- Expected vs actual behavior
- Potential impact
- Any suggested mitigation

Do not include real production secrets in a report.

## Secrets

The project expects deployment credentials to be stored outside the repository, including:

- DATABASE_URL
- NEON_AUTH_COOKIE_SECRET
- OPENAI_API_KEY
- HF_TOKEN
- RESEND_API_KEY
- provider service-role keys
- GitHub/Render credentials

The .env.example file contains placeholders only.

## Data protection

Do not commit:

- Resume files
- Personal candidate information
- User session data
- Production database exports
- Unredacted logs containing secrets or personal information

## Dependency and deployment hygiene

Before merging security-sensitive changes:

1. Run npm install.
2. Run npm run build.
3. Review dependency changes.
4. Review environment-variable changes.
5. Confirm public routes do not accidentally expose admin/account APIs.
6. Confirm authentication boundaries remain intact.

