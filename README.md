# Library Management System

A complete Library Management Web Application for issuing, tracking, and managing books. Built with React, Node.js, Express, and MySQL.

## Features

- **RBAC**: Admin and Teacher roles.
- **Book Management**: Add, edit, delete, and track books.
- **Book Issuing**: Teachers request books; Admins approve/reject.
- **Tracking**: Track issued books, return dates, and availability.
- **WhatsApp Notifications**: Admin receives WhatsApp alerts on new requests.
- **Dashboard**: Stats and insights for Admins; Browsing for Teachers.
- **Responsive UI**: Built with Tailwind CSS and React.

## Prerequisites

- Node.js (v18+)
- MySQL Server

## Setup Instructions

### 1. Database Setup
1. Create a MySQL database named `library_db`.
2. Import the schema from `backend/models/schema.sql` or run the SQL commands in your MySQL client.

### 2. Environment Variables
Configure the `.env` file in `backend/.env`.
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=library_db
JWT_SECRET=your_secret_key
# WhatsApp (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
ADMIN_PHONE_NUMBER=
```

### 3. Usage
Run the following commands from the root directory:

```bash
# Install dependencies for root, backend, and frontend
npm install
npm run install-deps

# Run both backend and frontend concurrently
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Admin Credentials
(You need to register a user via the UI, then manually set their role to 'admin' in the database for the first admin, or use a seed script if provided).

## Project Structure
- **/frontend**: React + Vite application.
- **/backend**: Express REST API.
