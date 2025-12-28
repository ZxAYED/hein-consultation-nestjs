# Marcus Backend (NestJS + Prisma)

An end-to-end backend for a service business platform: customers book appointments, upload documents, receive invoices, and get real-time notifications—while admins manage services, schedules, content, and operations.

## ✨ Why This Project Stands Out

- 🔐 **Production-style security**: JWT authentication + role-based access control (Customer/Admin).
- 🧾 **Business workflows**: appointment booking → documents → invoices → notifications + activity feed.
- ⚡ **Real-time updates**: WebSocket notification delivery for customers and admins.
- 🧠 **Backend engineering**: Prisma + PostgreSQL, transactional operations, consistent response shaping, validation, and deployment-ready Docker setup.

## 🚀 Features

### 👤 Users & Auth
- 🔑 **JWT auth guard** for protected endpoints.
- 🧭 **Role-based permissions** (Customer vs Admin) enforced at controller level.
- 🧱 Clean validation pipeline (DTO + `class-validator`) and global exception handling.

### 📅 Scheduling & Appointments
- 🗓️ **Schedule slot management** with availability states.
- 🔒 **Safe booking flow** using database transactions to prevent race conditions.
- 📎 **Attachment uploads** for appointments (stored in Supabase).
- 🧾 **One-click PDF export** of the current user’s appointments: `GET /appointments/export/pdf`.

### 📁 Documents
- 📤 Upload and manage user documents.
- 🧩 Document associations to appointments and invoices.
- 🧹 Storage cleanup logic for deleted files.

### 💳 Invoices
- 🧮 Invoice management for users and admins.
- 📄 PDF generation patterns (PDFKit) designed for “download-ready” UX.

### 📰 Blog & Services
- ✍️ Blog module for content publishing.
- 🧩 Service catalog with slugs and media upload support.

### 🔔 Notifications & Activity Feed
- 🧾 **Activity tracking** (who did what, to which entity) stored for dashboards and audit-style UI.
- 📣 **Notification delivery** via WebSockets and database persistence.
- 🌐 WebSocket endpoint: `/ws/notifications` (JWT token required).

### 📊 Dashboard
- 📈 Admin/customer dashboard stats.
- 🕒 Recent activity + notifications for a “product feel”.

## 🧩 Is This a SaaS?

This backend is **SaaS-style** in how it’s built and deployed:
- 🌍 It’s a hosted API that supports **many users** concurrently.
- 🧑‍💼 It implements **roles**, **workflows**, and **real-time events** like modern SaaS products.

Strictly speaking, it is **not a full multi-tenant SaaS** yet (there is no explicit “tenant/organization/workspace” model in the database). If you wanted true multi-tenancy, the clean module boundaries make it straightforward to add an `organizationId/tenantId` layer across models and authorization.

## 🏗️ Architecture Overview

- 🧱 **NestJS modules**: Users, Schedule, Appointments, Documents, Invoices, Blog, Services, Notifications, Activities, Dashboard, Events.
- 🗄️ **Data layer**: Prisma ORM with PostgreSQL.
- 🧵 **Real-time layer**: WebSocket gateway for notifications.
- 🪣 **File storage**: Supabase storage for uploads (documents/attachments/media).
- 📦 **Deployment-ready**: Docker build and compose flow supports migration deployment.

## 🛠️ Tech Stack

- 🟦 **NestJS** (API, guards, modules, validation)
- 🧬 **Prisma** (Postgres schema + migrations)
- 🐘 **PostgreSQL** (primary database)
- 🪣 **Supabase Storage** (file uploads)
- 🔌 **WebSocket (ws)** (real-time notifications)
- 🧾 **PDFKit** (PDF exports)
- 🐳 **Docker + Compose** (deploy and run)

## ▶️ Run Locally

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Set `DATABASE_URL`, `JWT_SECRET`, Supabase + SMTP values in `.env`
3. Apply migrations and generate Prisma client:
   - `npx prisma migrate dev`
   - `npx prisma generate`
4. Start the server:
   - `npm run start:dev`

## ✅ Tests & Quality

- 🧪 Unit tests:
  - `npm test`
- 🧹 Lint:
  - `npm run lint`
- 🧠 Typecheck:
  - `npx tsc -p tsconfig.json --noEmit`

## 🚢 Deployment Notes

- Docker build generates Prisma client and builds the NestJS app.
- Compose runs database migrations on startup:
  - `npx prisma migrate deploy && node dist/main.js`


