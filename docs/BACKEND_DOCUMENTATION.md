# Marcus Backend System Documentation

## 1. Project Overview

This is a robust, scalable backend system built with **NestJS**, a progressive Node.js framework. It uses a modular architecture to ensure maintainability and separation of concerns. The system is designed to handle complex business logic including appointment scheduling, content management (blogs), invoicing, and real-time notifications.

### Tech Stack
*   **Framework**: NestJS (Node.js)
*   **Database**: PostgreSQL (Relational Data)
*   **ORM**: Prisma (Type-safe database access)
*   **Caching & Queues**: Redis & BullMQ
*   **File Storage**: Supabase Storage
*   **Real-time**: WebSockets (`platform-ws`)
*   **PDF Generation**: PDFKit

---

## 2. Authentication & Security

The system implements a secure, token-based authentication mechanism.

### 2.1 JWT Authentication
*   **Mechanism**: JSON Web Tokens (JWT).
*   **Flow**: Users receive an access token upon login/registration. This token must be included in the `Authorization: Bearer <token>` header for protected endpoints.
*   **Validation**: The global `AuthGuard` verifies the token signature and checks the database to ensure the user exists and is active.

### 2.2 Role-Based Access Control (RBAC)
*   **Decorators**: Endpoints are protected using the custom `@Roles()` decorator.
*   **Roles**: `CUSTOMER`, `ADMIN`.
*   **Implementation**: The `AuthGuard` automatically checks if the authenticated user has the required role to access a specific resource.
    *   *Example*: Only `ADMIN` can create blog posts. Both `CUSTOMER` and `ADMIN` can view appointments.

---

## 3. Core Modules & API Capabilities

### 3.1 User Management (`/user`)
Handles user registration, profile management, and dashboard statistics.
*   **Registration**: Supports multipart form-data for profile image uploads (uploaded to Supabase).
*   **Dashboard**: Provides aggregated statistics for the user (e.g., total appointments, pending invoices).
*   **Admin Features**: Admins can create users without OTP verification and view all users with pagination and filtering (`isBlocked`, `limit`, `page`).

### 3.2 Appointment System (`/appointments`)
A comprehensive booking system that links users, services, and time slots.
*   **Booking**: Customers can book appointments with attachments.
    *   *Validation*: Custom JSON parsing handles complex data within `multipart/form-data` requests to allow simultaneous file uploads and data submission.
*   **PDF Export**: Generates dynamic PDF reports of appointments on-the-fly using `PDFKit`.
*   **Data Integrity**: Ensures appointments are linked to valid schedule slots and services.

### 3.3 Content Management (Blog) (`/blog`)
A full-featured CMS for managing articles.
*   **Scheduling**: Supports `DRAFT`, `PUBLISH`, and `SCHEDULED` statuses. Scheduled posts are automatically published at the specified date.
*   **SEO Friendly**: Auto-generates unique "slugs" for URLs based on titles.
*   **Media**: Integrates with Supabase for high-performance image hosting.
*   **Validation**: Strict DTO validation ensures titles, content, and dates are correct before saving.

### 3.4 Notifications & Real-time (`/notifications`)
*   **WebSockets**: Uses a Gateway to push real-time updates to connected clients.
*   **Redis Pub/Sub**: Scales horizontally by syncing notifications across multiple server instances via Redis.
*   **Storage**: Persists notifications in Postgres so users can view history even if they were offline.

### 3.5 Infrastructure Modules
*   **Schedule Module**: Manages available time slots (`ScheduleSlot`) for appointments.
*   **Invoice Module**: Generates and tracks invoices for completed appointments.
*   **Document Module**: Centralized management for user uploaded files.

---

## 4. Technical Implementation & Validations

### 4.1 Data Validation
*   **DTOs (Data Transfer Objects)**: Every API request is validated against strict TypeScript classes using `class-validator`.
    *   *Example*: `CreateAppointmentDto` ensures `date` is a valid ISO string and `serviceId` exists.
*   **Global Pipes**: A global `ValidationPipe` automatically strips unknown properties (whitelist) and transforms payloads to their correct types.
*   **Multipart Handling**: Custom logic in controllers parses JSON strings inside form-data to allow rich data structures alongside file uploads.

### 4.2 Scalability Features
*   **Redis Caching**: Frequently accessed data (like public blog posts) is cached in Redis to reduce database load.
*   **Asynchronous Jobs (BullMQ)**: Heavy tasks like sending emails or generating complex reports are offloaded to a background queue. This ensures the API remains fast and responsive.
*   **Database Indexing**: Prisma schema includes `@index` on frequently queried fields (e.g., `email`, `appointmentNo`, `date`) to ensure fast lookups as data grows.

### 4.3 Error Handling
*   **Global Exception Filter**: Catches all application errors and returns a standardized JSON response structure, making it easy for the frontend to handle errors consistently.

---

## 5. System Strong Points (Why this architecture?)

1.  **Scalable**: The use of Redis for caching and queues means the system can handle traffic spikes without crashing.
2.  **Type-Safe**: End-to-end type safety (TypeScript + Prisma) reduces bugs significantly.
3.  **Modular**: The code is organized into feature modules. Adding a new feature (e.g., "Chat") won't break existing ones.
4.  **Secure**: Security is baked in (Guards, DTO validation, Helmet, CORS) rather than an afterthought.
5.  **Future-Proof**: The architecture supports horizontal scaling (adding more servers) because state (sessions, queues, sockets) is managed in Redis, not in server memory.
