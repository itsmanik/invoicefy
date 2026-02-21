# Invoicefy

Invoicefy is a full-stack, professional invoicing and client management system built with modern web technologies. This application allows business owners to manage clients, track invoices, generate professional PDFs, and track payment statuses (Paid, Unpaid, Overdue) all from an intuitive dashboard.

---

## 🚀 Features

- **Authentication System**: Secure login and registration for business owners.
- **Interactive Dashboard**: View real-time aggregated metrics like Total                 Revenue, Outstanding amounts, and Invoice Statuses.
- **Client Management**: Create and track profiles for your billing clients including Name, Email, Phone, and Address.
- **Dynamic Invoicing System**: Create dynamic invoices with multiple auto-calculating line items, custom discount percentages, and tax processing.
- **PDF Generation**: Generate beautiful, professional, printer-ready PDF invoices using the native backend on-the-fly.
- **Status Tracking**: Keep track of pending payments by marking invoices as "Paid", "Unpaid", or "Overdue".

---

## 🛠️ Technology Stack

### Frontend (`/invoicefy-frontend`)
- **React.js**: Front-end UI rendered as a Single Page Application.
- **Tailwind CSS**: Utility-first CSS framework for a premium and seamless user interface.
- **Axios**: Promised-based HTTP requests to hook into the backend.
- **React Router**: For handling client-side routing and protected boundaries.

### Backend (`/server`)
- **Node.js & Express**: Extensible and lightweight backend server architecture.
- **Sequelize ORM**: Connects the Node app to the database seamlessly.
- **SQLite Database**: File-based database out of the box (`invoicefy.sqlite`), requires zero manual setup.
- **PDFKit**: Server-side engine to generate and stream invoices as PDF downloads.
- **JWT & Bcrypt**: Handles encrypted passwords and tokenized user sessions.

---

## 📦 Project Structure

```text
d:\invoicefy\
│
├── invoicefy-frontend/          # React.js Frontend
│   ├── src/                     # React Source Code (Pages, Contexts, APIs)
│   ├── tailwind.config.js       # Tailwind CSS Configuration
│   └── package.json             # Frontend Dependencies
│
├── server/                      # Node.js + Express Backend
│   ├── app.js                   # Main Node Entrypoint
│   ├── invoicefy.sqlite         # SQLite Database (Auto-generated)
│   ├── config/                  # Sequelize and DB connection
│   ├── pdf-service/             # PDFKit Invoice Generator 
│   ├── ... (Controllers, Routes, Models grouped by feature)
│   └── package.json             # Backend Dependencies
│
├── start-frontend.bat           # Quickstart script for Frontend
└── start-backend.bat            # Quickstart script for Backend
```

---

## ⚡ Getting Started 

You can use the shell scripts located in the root of the project to quickly spin up the environment.

### Using the Quickstart Scripts
1. Open terminal in the root directory (`d:\invoicefy`).
2. Run the backend by double-clicking or typing `start-backend.bat`
3. Run the frontend by double-clicking or typing `start-frontend.bat`

### Manual Start 
If you prefer running manual commands:

**Starting the Backend:**
```bash
cd server
npm install
npm run dev
```
*(Backend Server will start on `http://localhost:5000`)*

**Starting the Frontend:**
```bash
cd invoicefy-frontend
npm install
npm start
```
*(React App will open on `http://localhost:3000`)*

---

## 👤 Default Flow to Test

1. Navigate to your app at `http://localhost:3000`.
2. Ensure the backend is running alongside the frontend.
3. Once loaded, click the **"Register"** button to establish your local database owner credentials.
4. Go to **"Clients"** in the navigation bar to add your first mockup client.
5. Hit **"Create Invoice"**, select your new client, and add a few line items to generate an invoice.
6. Check your **"Invoices"** table and click **"Download PDF"** to test the server's PDF generator!

TEst