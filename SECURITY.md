# Security notes

- The API binds to localhost by default.
- Uploads are restricted by extension, signature and configured size.
- Uploaded names are display metadata; generated UUID filenames are used on disk.
- The LLM receives retrieved passages as evidence and is instructed to treat them as untrusted data.
- The LLM has no filesystem, shell, or administrative tools.
- Deletion endpoints are destructive and currently assume a trusted local single-user environment.

Before network deployment:
1. Add authentication and authorization.
2. Add CSRF protection if using cookie-based sessions.
3. Use HTTPS and a restrictive reverse proxy.
4. Add per-user document and conversation ownership checks.
5. Add a durable task queue and transactional deletion/outbox design.
6. Run malware scanning and PDF sandboxing appropriate to the threat model.
7. Add rate limiting at the proxy and application layers.
8. Add tested backup/restore and audit logging.
9. Perform dependency, container, and application security reviews.

No software can guarantee complete forensic erasure on SSDs, backups, snapshots, or filesystem journals. The erase endpoint removes application-managed active records and files only.
