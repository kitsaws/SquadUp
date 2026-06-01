# SquadUp

Initial Turborepo monorepo for SquadUp using pnpm workspaces and TypeScript.

## Folder Structure

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web
│       ├── src
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── styles.css
│       │   └── vite-env.d.ts
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages
│   └── shared
│       ├── src
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── turbo.json
```

## Installation

Enable pnpm through Corepack if pnpm is not already installed:

```bash
corepack enable pnpm
```

If Corepack cannot create the pnpm shim on Windows, run the command from an elevated shell or install pnpm globally.

Then install dependencies:

```bash
pnpm install
```

## Run

Start the React frontend and Express API together:

```bash
pnpm dev
```

The frontend runs on Vite's default port:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Build And Typecheck

```bash
pnpm build
pnpm typecheck
```
