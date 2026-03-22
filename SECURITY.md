# Security Policy

## Reporting Security Vulnerabilities
If you discover a security vulnerability within this project, please report it by emailing us at **movilextra3@gmail.com**. We will respond quickly to your email and provide feedback regarding your report.

## Security Practices
We take security seriously and follow best practices to ensure the protection of our users' data. This includes:
- Regularly updating dependencies
- Conducting code reviews
- Using automated security testing tools

### Comprobaciones en el repositorio
- **Local:** `npm run security:secrets` — patrones de alto riesgo en archivos rastreados por Git.
- **CI (GitHub Actions):** workflow *Security — secret scan* (Gitleaks + el mismo chequeo Node) al hacer push/PR.
- **Dependabot:** `.github/dependabot.yml` propone actualizaciones npm semanales (revisar PRs antes de fusionar).
- En GitHub: activar en el repo **Code security** lo que permita tu plan (p. ej. *secret scanning*, *push protection* para secretos); no se configura solo con archivos del proyecto.

## Responsible Disclosure
We appreciate your responsible disclosure of security issues. We will respond to your reports promptly and work with you to understand the vulnerability and correct it before disclosing any details publicly.

Thank you for helping us keep our project secure!
