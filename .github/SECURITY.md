# Security Policy

FoxLaunch is a privacy-first, offline-only Firefox extension. Security and user privacy are foundational design requirements.

---

## Supported Versions

Security updates and patches are provided for the current active version:

| Version | Supported |
| --- | --- |
| 1.2.x | :white_check_mark: |
| < 1.2.0 | :x: |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in FoxLaunch, please report it responsibly using one of the following methods:

### 1. GitHub Private Vulnerability Reporting (Preferred)
Submit a confidential advisory directly to the maintainers:
1. Navigate to the **Security** tab of this repository.
2. Under **Reporting**, click **Report a vulnerability**.
3. Fill out the details, including proof-of-concept steps and affected versions.

### 2. Maintainer Contact
If you cannot use GitHub's advisory tool, you may contact the maintainer directly via GitHub profile: [@melkorCBA](https://github.com/melkorCBA).

---

## Vulnerability Handling Process

1. **Acknowledgment**: We aim to acknowledge receipt of security reports within 48 hours.
2. **Assessment**: We will evaluate the impact, severity, and reproducibility of the issue.
3. **Remediation**: Once verified, a fix will be prepared and tested.
4. **Coordinated Disclosure**: A patched version will be tagged, released, and submitted to Mozilla Add-ons (AMO). We will credit reporters in the release notes unless anonymity is requested.

---

## Security Architecture & Scope

FoxLaunch adheres to strict architectural boundaries:
- **Zero Remote Network Calls**: FoxLaunch does not communicate with any external servers, CDNs, or telemetry endpoints.
- **Strict Content Security Policy**: Enforces `script-src 'self'; object-src 'self'`.
- **No Unsafe DOM Injection**: No use of `innerHTML`, `outerHTML`, or `eval`.
- **Container Boundary Isolation**: Web context isolation relies on Firefox's native `contextualIdentities` and cookie store separation.
