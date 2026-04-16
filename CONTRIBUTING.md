# Contributing to Main Menu

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/ScottSEA/main-menu.git
   cd main-menu
   ```

2. **Install dependencies** (requires Node 20+)
   ```bash
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (JWT_SECRET at minimum)
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: API server
   node server/src/index.js

   # Terminal 2: Vue dev server
   cd client && npx vite --port 5173
   ```

5. **Open** http://localhost:5173

## Workflow

1. Create a branch from `main`: `git checkout -b feature/your-feature`
2. Make your changes
3. Run linting: `npm run lint`
4. Build the client: `cd client && npx vite build`
5. Open a pull request against `main`
6. CI must pass (lint + build + server health check)
7. Get one approving review

## Code Style

- **Server:** Node.js CommonJS, ESLint enforced
- **Client:** Vue 3 Composition API (`<script setup>`), ESLint + eslint-plugin-vue
- **CSS:** Use CSS variables from `client/src/style.css` (dark theme)
- **Database:** Prices as integer cents, UUIDs for IDs
- **Templates:** Handlebars files on disk, metadata in DB

## Commit Messages

Use clear, descriptive commit messages. Format:
```
Short summary (imperative mood)

Longer description if needed.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Reporting Issues

- **Bugs:** Use the Bug Report issue template
- **Features:** Use the Feature Request issue template
- **Security:** See [SECURITY.md](SECURITY.md) — do not open public issues
