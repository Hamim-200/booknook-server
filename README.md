# BookNook Server

The REST API for **BookNook**, a small online library where users add a book, borrow a book, and return a book.

- **Client repository:** https://github.com/Hamim-200/booknook-client

## Features

- 8 API routes for books and borrows, built with Express.js and MongoDB
- Login protection with JWT: tokens from Better Auth are verified with its public keys (JWKS)
- Owner checks: only the person who added a book can edit or delete it
- Borrowing keeps copies in sync: `$inc` lowers the available copies on borrow and raises them on return
- No double borrow: a unique database index and a server check stop the same user borrowing the same book twice
- CORS limited to the BookNook client website

## API routes

| Method | Route | Access | What it does |
|---|---|---|---|
| GET | `/books` | public | All books, newest first. Optional `?limit=6` and `?email=` |
| GET | `/books/:id` | login | One book |
| POST | `/books` | login | Add a book |
| PATCH | `/books/:id` | login, owner | Update a book |
| DELETE | `/books/:id` | login, owner | Delete a book and its borrow records |
| POST | `/borrows` | login | Borrow a book (7 days) |
| GET | `/borrows` | login | The logged-in user's borrows |
| DELETE | `/borrows/:id` | login, own borrow | Return a book |

Protected routes need the header `Authorization: Bearer <token>`.

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Name | Meaning |
|---|---|
| `PORT` | Port for local development (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (`booknook`) |
| `AUTH_URL` | Address of the BookNook client, which issues and signs the tokens |
| `CLIENT_URL` | Address(es) allowed to call this API, separated by commas |

## Run locally

```bash
npm install
npm run dev
```

The server starts at http://localhost:5000.

## Built with

Node.js, Express.js, MongoDB (official driver), jose (JWT verification), cors, dotenv