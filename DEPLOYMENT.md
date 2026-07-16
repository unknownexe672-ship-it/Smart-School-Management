# Deployment guide

## 1. Deploy the API to Render

1. Create a new Web Service in Render.
2. Connect this GitHub repository.
3. Use the following settings:
   - Build Command: `pnpm install && pnpm --filter @workspace/api-server build`
   - Start Command: `pnpm --filter @workspace/api-server start`
4. Add these environment variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `DATABASE_URL=...`
   - `DEEPSEEK_API_KEY=...`
   - `SESSION_SECRET=...`
5. Deploy.

## 2. Deploy the frontend to Netlify

1. Create a new site in Netlify.
2. Connect this GitHub repository.
3. Use the settings from `netlify.toml`:
   - Base directory: `/`
   - Build command: `pnpm install && pnpm --filter @workspace/school-app build`
   - Publish directory: `artifacts/school-app/dist`
4. Add this environment variable:
   - `VITE_API_URL=https://your-render-app-url`
5. Deploy.

## 3. Verify

- API health: `https://your-render-app-url/api/healthz`
- Frontend: `https://your-netlify-site-url`
