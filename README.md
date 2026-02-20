``` # Invoicefy

Invoicefy is an invoice generating application with a React frontend and an Express + Sequelize backend.

This repository currently includes:
- `client/` (Vite + React)
- `server/` (Node.js + Express + Sequelize + JWT auth + PDF generation)

---

## Features Implemented

### Business Onboarding & Auth
- Register as **Business Owner**
- Create business profile with:
  - Business name
  - GST number
  - Address
  - Optional logo upload
- Login with email/password
- JWT-based route protection

### Client Management
- Create client profile
- Fetch all clients for the logged-in business

### Invoice Management
- Create invoice for a client
- Auto-generate invoice number
- Add multiple items (description, quantity, unit price)
- Apply discount and tax
- Automatic subtotal/tax/total calculation
- Fetch invoice details
- Update invoice status: `Paid`, `Unpaid`, `Overdue`

### PDF Generation
- Download invoice as a formatted PDF

### Analytics
- Dashboard metrics:
  - total invoices
  - paid/unpaid/overdue counts
  - total revenue (paid invoices)
  - outstanding amount
  - invoices created in last 30 days

---

## Tech Stack

### Frontend
- React 19
- Vite

### Backend
- Node.js
- Express
- Sequelize ORM
- SQLite (default local DB)
- MySQL (optional via env)
- JWT auth (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- File upload (`multer`)
- PDF generation (`pdfkit`)

---

## Project Structure

```text
invoicefy/
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── analytics/
│   ├── auth/
│   ├── businesses/
│   ├── clients/
│   ├── config/
│   ├── invoices/
│   ├── middleware/
│   ├── pdf-service/
│   ├── uploads/
│   ├── .env.example
│   ├── app.js
│   └── package.json
└── README.md
```

---

## Backend Data Models

### Business
```json
{
  "name": "string",
  "gstNumber": "string",
  "address": "string",
  "logoUrl": "string | null"
}
```

### User
```json
{
  "businessId": "number",
  "name": "string",
  "email": "string",
  "passwordHash": "string",
  "role": "Business Owner"
}
```

### Client
```json
{
  "businessId": "number",
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string"
}
```

### Invoice
```json
{
  "businessId": "number",
  "clientId": "number",
  "invoiceNumber": "string",
  "items": [
    {
      "description": "string",
      "quantity": "number",
      "unitPrice": "number"
    }
  ],
  "subtotal": "number",
  "tax": "number",
  "discount": "number",
  "total": "number",
  "status": "Paid | Unpaid | Overdue",
  "createdAt": "datetime"
}
```

---

## API Documentation

Base URL (local): `http://localhost:3000`

### Health
- `GET /health`

### Auth
- `POST /auth/register` *(multipart/form-data; supports `logo` file)*
- `POST /auth/login`

### Business
- `GET /business/me` *(protected)*

### Clients
- `POST /client/create` *(protected)*
- `GET /client/all` *(protected)*

### Invoices
- `POST /invoice/create` *(protected)*
- `GET /invoice/:id` *(protected)*
- `PUT /invoice/status` *(protected)*
- `GET /invoice/download?id=<invoiceId>` *(protected, returns PDF)*

### Analytics
- `GET /analytics/dashboard` *(protected)*

---

## Auth Header

For protected routes include:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Setup Instructions

## 1) Clone repository

```bash
git clone <your-repo-url>
cd invoicefy
```

## 2) Backend setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Backend starts on `http://localhost:3000` by default.

### `.env` options

```env
PORT=3000
JWT_SECRET=replace-with-secure-secret

# sqlite (default)
DB_DIALECT=sqlite
DB_STORAGE=./invoicefy.sqlite

# mysql (optional)
# DB_DIALECT=mysql
# DB_NAME=invoicefy
# DB_USER=root
# DB_PASSWORD=
# DB_HOST=localhost
```

## 3) Frontend setup

Open new terminal:

```bash
cd client
npm install
npm run dev
```

Frontend runs on Vite dev server (usually `http://localhost:5173`).

---

## Example Request Payloads

### Register Business Owner
`POST /auth/register`

Use `multipart/form-data`:
- `ownerName`
- `email`
- `password`
- `businessName`
- `gstNumber`
- `address`
- `logo` (optional file)

### Login
`POST /auth/login`

```json
{
  "email": "owner@invoicefy.com",
  "password": "yourPassword"
}
```

### Create Client
`POST /client/create`

```json
{
  "name": "Acme Corp",
  "email": "billing@acme.com",
  "phone": "+91-9876543210",
  "address": "Bangalore, India"
}
```

### Create Invoice
`POST /invoice/create`

```json
{
  "clientId": 1,
  "items": [
    {
      "description": "Website Design",
      "quantity": 2,
      "unitPrice": 5000
    },
    {
      "description": "Hosting",
      "quantity": 1,
      "unitPrice": 2000
    }
  ],
  "tax": 18,
  "discount": 10
}
```

### Update Invoice Status
`PUT /invoice/status`

```json
{
  "invoiceId": 1,
  "status": "Paid"
}
```

---

## Notes

- Invoice creation auto-computes:
  - `subtotal`
  - tax amount from tax %
  - final `total` after discount + tax
- Database tables are auto-synced on backend start (`sequelize.sync({ alter: true })`).
- Uploaded business logos are served from `/uploads/<filename>`.

---

## Troubleshooting

- If `npm install` fails due to registry/network policy, retry in a network-enabled environment.
- If JWT errors occur, verify:
  - token is sent in `Authorization` header
  - backend `JWT_SECRET` matches the token issuer
- For MySQL mode, ensure server is running and credentials are correct in `.env`.

---

## Future Improvements

- Add request validation layer (Joi/Zod/express-validator)
- Add pagination for clients/invoices
- Add invoice list and search APIs
- Add due-date based automatic overdue marking
- Add unit/integration tests (Jest + Supertest)
- Add Docker support for reproducible local/dev deployment

---

## License

This project currently has no explicit open-source license. Add a LICENSE file if you plan to publish/distribute it.
 ```
