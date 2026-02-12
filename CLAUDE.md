# Project: learn-nuxt

## Tech Stack

- **Framework**: Nuxt v4 (`^4.3.1`) with Vue 3 (`^3.5.28`)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS v4 (`^4.1.18`) via `@tailwindcss/vite` plugin + DaisyUI v5 (`^5.5.18`)
- **Linting**: ESLint v10 with `@antfu/eslint-config` v7 + `@nuxt/eslint` v1.15
- **Icons**: `@nuxt/icon` v2 with `@iconify-json/tabler` icon set
- **Build**: Vite v7 (`^7.3.1`)
- **Git Hooks**: Husky v9 + lint-staged v16 (runs `pnpm lint` on all staged files)
- **Formatter**: `eslint-plugin-format` v1

## Project Structure (Nuxt v4 `app/` directory)

- `app/app.vue` - root component
- `app/assets/css/main.css` - global CSS (Tailwind + DaisyUI)
- `app/pages/`, `app/components/`, `app/composables/`, `app/layouts/`, `app/plugins/`, `app/middleware/`, `app/utils/` - standard Nuxt dirs

## ESLint Rules (MUST follow when writing code)

- **Indent**: 2 spaces
- **Semicolons**: always required
- **Quotes**: double quotes (`"`)
- **Type definitions**: use `type` keyword, NOT `interface` (`ts/consistent-type-definitions: ["error", "type"]`)
- **File naming**: kebab-case enforced (`unicorn/filename-case`)
- **Imports**: sorted by perfectionist plugin
- **No `process.env`**: use `useRuntimeConfig()` instead (`node/no-process-env: error`)
- **Top-level await**: allowed (`antfu/no-top-level-await: off`)
- **console.log**: warns (`no-console: warn`)
- **Formatters**: enabled (CSS, HTML, markdown via eslint-plugin-format)

### What This Means for Code Generation

1. Always use double quotes in JS/TS
2. Always end statements with semicolons
3. Use `type Foo = { ... }` not `interface Foo { ... }`
4. Name new files in kebab-case (e.g., `user-profile.vue`, not `UserProfile.vue`)
5. Sort imports (type imports, then external, then internal)
6. Use 2-space indentation
7. Never use `process.env` - use Nuxt's `useRuntimeConfig()` instead
8. Minimize `console.log` usage (it warns)

## Tailwind v4 + DaisyUI v5 Notes

- Tailwind v4 uses CSS-first config (`@import "tailwindcss"` in CSS, NOT `tailwind.config.js`)
- DaisyUI v5 uses `@plugin "daisyui"` directive in CSS (NOT JS config)
- Dark theme is the default: `themes: dark --default`
- Tailwind is loaded as a Vite plugin (`@tailwindcss/vite`), NOT PostCSS

## Critical: Avoid Deprecated Features

- **Nuxt 4**: Uses `app/` directory structure (not root-level `pages/`, `components/`, etc.)
- **Tailwind v4**: No `tailwind.config.js` - use CSS-based config. No `@apply` in components (use utility classes). Theme values via CSS variables.
- **DaisyUI v5**: Component classes may differ from v4. Check DaisyUI v5 docs.
- **Vue 3.5+**: Use modern APIs. Avoid Options API unless requested.
- **ESLint v10 flat config**: No `.eslintrc` files.
