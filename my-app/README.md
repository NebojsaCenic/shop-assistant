# Moja korpa

Angular standalone application for a private Serbian-language grocery catalogue, deployed as static assets with Cloudflare Wrangler.

## Requirements

- Node.js `^22.22.3`, `^24.15.0`, or `>=26.0.0`
- npm

## Local development

```bash
npm ci
npm start
```

The development server is available at `http://localhost:4200/`.

## Checks and deployment

```bash
npm test -- --watch=false
npm run build
npm run deploy
```

The production build is written to `dist/my-lists-app/browser`, which Wrangler publishes. `npm run deploy` builds first and then runs `wrangler deploy`.

## Supabase configuration

When the Supabase project is ready, set `supabaseUrl` and `supabasePublishableKey` in `src/environments/environment.ts`. The publishable key is intended for browser use and must be protected by database Row Level Security. Never put a Supabase service-role key in the frontend.

The app uses one manually provisioned email/password account. Public sign-up should remain disabled in the hosted Supabase project's Auth settings.

## Database migrations

Migrations live in `supabase/migrations`. After authenticating the Supabase CLI and linking this app to the hosted project, check and apply pending migrations:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:status
npm run db:push
```

The database password and Supabase personal access token are entered only in the CLI; do not commit them or place them in frontend configuration.
