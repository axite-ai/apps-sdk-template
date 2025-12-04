# Deployment Guide

This guide covers deploying the Axite MCP Template to various platforms.

## Supported Platforms

- **Railway** - Recommended for quick deployment
- **Vercel** - Excellent for serverless deployment
- **Self-hosted** - Any Node.js hosting provider

## Prerequisites

Before deploying, ensure you have:

1. A PostgreSQL database (recommended: Neon, Supabase, or Railway Postgres)
2. A Redis instance (recommended: Upstash or Railway Redis)
3. (Optional) Stripe account for subscriptions
4. (Optional) Resend account for transactional emails

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BETTER_AUTH_SECRET` | Session signing secret (generate with `openssl rand -base64 32`) |
| `ENCRYPTION_KEY` | 32-byte hex key (generate with `openssl rand -hex 32`) |

### Platform-Specific Variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Your deployment URL (auto-detected on Railway/Vercel) |
| `BETTER_AUTH_URL` | Full URL for OAuth redirects (e.g., `https://your-app.com/api/auth`) |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `ENABLE_SUBSCRIPTIONS` | Set to `true` to enable Stripe subscriptions |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_BASIC_PRICE_ID` | Price ID for basic plan |
| `STRIPE_PRO_PRICE_ID` | Price ID for pro plan |
| `RESEND_API_KEY` | Resend API key for emails |
| `EMAIL_FROM` | From address for transactional emails |

---

## Railway Deployment

Railway is the recommended platform for quick deployment.

### 1. Create a Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a PostgreSQL database
3. Add a Redis instance

### 2. Deploy the Application

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

### 3. Configure Environment Variables

In the Railway dashboard:

1. Go to your service → Variables
2. Add all required environment variables
3. Railway automatically sets `RAILWAY_PUBLIC_DOMAIN`

### 4. Run Database Migrations

```bash
railway run pnpm db:push
```

### 5. Configure Webhook URLs

For Stripe webhooks, use:
```
https://your-app.railway.app/api/auth/stripe/webhook
```

---

## Vercel Deployment

### 1. Import Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project" → Import Git Repository
3. Select your forked repository

### 2. Configure Project

1. Framework Preset: **Next.js**
2. Build Command: `pnpm build`
3. Install Command: `pnpm install`

### 3. Add Environment Variables

In the Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add all required environment variables
3. Vercel automatically sets `VERCEL_URL`

### 4. Deploy

Vercel will automatically deploy on push to main branch.

### Notes for Vercel

- Serverless functions have a 10-second timeout on the free tier
- Use external PostgreSQL and Redis (not Vercel's offerings for best compatibility)
- Configure `BETTER_AUTH_URL` to include `/api/auth` path

---

## Self-Hosted Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app
RUN corepack enable pnpm

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t axite-mcp .
docker run -p 3000:3000 --env-file .env axite-mcp
```

### Manual Deployment

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# Run database migrations
pnpm db:push

# Start the server
pnpm start
```

---

## Post-Deployment Steps

### 1. Verify OAuth Endpoints

Test the OpenID discovery endpoint:
```bash
curl https://your-app.com/.well-known/openid-configuration
```

### 2. Configure ChatGPT/Claude Integration

1. In ChatGPT custom GPT settings, add your MCP endpoint:
   ```
   https://your-app.com/mcp
   ```

2. Configure OAuth callback URLs in your auth settings

### 3. Set Up Stripe Webhooks (if using subscriptions)

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.com/api/auth/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`

### 4. Verify Database Connection

Check that migrations ran successfully:
```bash
pnpm db:studio
```

---

## Troubleshooting

### OAuth Redirect Issues

If OAuth redirects fail:
1. Verify `BETTER_AUTH_URL` includes the full path (`/api/auth`)
2. Check that the redirect URIs match exactly in your OAuth provider settings
3. Ensure cookies are set with `SameSite=Lax` for cross-site redirects

### Database Connection Errors

1. Verify `DATABASE_URL` is correct
2. Check that SSL is configured correctly (`POSTGRES_SSL=true` if required)
3. Ensure the database user has proper permissions

### Redis Connection Errors

1. Verify `REDIS_URL` is correct
2. Check Redis is accessible from your deployment
3. Ensure TLS is configured correctly for production

### Widget Loading Issues

If widgets don't load in ChatGPT:
1. Check that `assetPrefix` in `next.config.ts` matches your deployment URL
2. Verify CORS headers are set correctly in `middleware.ts`
3. Check browser console for CSP violations

---

## Monitoring

### Logs

Check application logs for errors:
- Railway: View logs in the Railway dashboard
- Vercel: View logs in the Vercel dashboard → Deployments → Logs

### Health Checks

The application should respond to:
- `GET /` - Main page
- `GET /.well-known/openid-configuration` - OAuth discovery
- `POST /mcp` - MCP endpoint

---

## Scaling Considerations

### Database

- Enable connection pooling (PgBouncer or similar)
- Configure read replicas for high-traffic scenarios
- Use database indexes for frequently queried columns

### Redis

- Use Redis Cluster for high availability
- Configure appropriate TTLs for cached data
- Monitor memory usage

### Application

- Configure multiple instances behind a load balancer
- Use sticky sessions for OAuth flows
- Implement rate limiting at the infrastructure level
