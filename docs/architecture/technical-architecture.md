# Technical architecture

## Foundation principles

- Clear separation between UI, API, and data layers.
- Shared contracts for predictable cross-app communication.
- Modular design for incremental feature delivery.
- Security-first defaults with environment configuration and validation.

## Recommended stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: PostgreSQL + Prisma
- Runtime: Node.js
- Tooling: npm workspaces, Docker Compose

## Architecture shape

```text
web app -> REST API -> service layer -> Prisma -> PostgreSQL
                    \-> validation & auth middleware
```

## Deliverables

- Stable app shell
- Shared contract package
- Environment template configuration
- Database schema foundation
- Developer-ready scripts and architecture docs
