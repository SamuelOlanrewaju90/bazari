# Bazari Backend

A REST API for the Bazari marketplace demo. Node.js + Express + Postgres.

## Get a free Postgres database (Neon)

1. Go to neon.tech and sign up (free tier, no credit card).
2. Create a project. Neon gives you a connection string that looks like:
   `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/dbname?sslmode=require`
3. Copy that string — you'll need it below.

(Supabase's free Postgres works the same way if you'd rather use that instead.)

## Setup

```bash
cd bazari-backend
npm install
cp .env.example .env
# open .env and set:
#   JWT_SECRET   -> any long random string
#   DATABASE_URL -> the connection string from Neon

npm run seed    # creates tables and loads the product catalog
npm start        # starts the API on http://localhost:4000
```

`npm run seed` also creates the tables if they don't exist yet, so it's safe to run
once before the first `npm start`. `npm start` itself will also create missing tables
on boot, so redeploying is safe too.

Use `npm run dev` instead of `npm start` while developing — it restarts on file changes.

## Authentication

Sign up or log in to get a JWT. Send it on every protected request as:

```
Authorization: Bearer <token>
```

Cart and order endpoints require this header. Product endpoints are public.

## API Reference

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | password ≥ 6 chars |
| POST | `/api/auth/login` | `{ email, password }` | |

Both return `{ token, user }`.

### Products (public)
| Method | Path | Query | Notes |
|---|---|---|---|
| GET | `/api/products` | `?category=electronics&search=phone` | both optional |
| GET | `/api/products/:id` | | |

### Cart (auth required)
| Method | Path | Body |
|---|---|---|
| GET | `/api/cart` | |
| POST | `/api/cart` | `{ productId, qty }` |
| PATCH | `/api/cart/:productId` | `{ qty }` — qty ≤ 0 removes the item |
| DELETE | `/api/cart/:productId` | |

### Orders (auth required)
| Method | Path | Body |
|---|---|---|
| POST | `/api/orders` | `{ shipping: { name, address, city, phone } }` — places an order from the current cart, decrements stock, clears the cart |
| GET | `/api/orders` | order history, newest first |
| GET | `/api/orders/:id` | single order (must belong to the caller) |

## Production notes

This is a demo-grade setup. Before deploying for real traffic, you'd want to add:
rate limiting, input validation middleware, HTTPS, refresh tokens or shorter-lived
access tokens, and connection pooling tuned for your Postgres provider's limits
(Neon's free tier has a small connection cap — fine for a demo's traffic).
