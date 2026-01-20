# VPS Deployment Guide (Docker + Local Postgres & Redis)

This guide will walk you through deploying your NestJS application to your company's VPS using Docker. We will run **Postgres** and **Redis** locally within Docker containers on the VPS, as requested.

---

## 1. Understanding "Clone and Build"

Your developer suggested: _"clone github rep in vps then docker compose up build -d"_.

**What this means:**
Instead of building the Docker image on your computer and uploading it to a registry (like Docker Hub), you simply download the source code (Clone) to the VPS and let the VPS build the Docker image itself.

**Why is this good for you?**

- **Simpler**: No need to set up a private Docker Hub account or configure image pushing.
- **Fast Updates**: To update the app, you just pull the latest code (`git pull`) and rebuild.

---

## 2. Prerequisites

- **VPS Access**: You must be able to SSH into your server.
- **Git**: Installed on the VPS.
- **Docker & Docker Compose**: Installed on the VPS.

### 2.1 Install Docker (if not installed)

Run these commands on your VPS (Ubuntu/Debian):

```bash
# Update packages
sudo apt update
sudo apt install -y curl git

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

---

## 3. Step-by-Step Deployment

### Step 1: Connect to your VPS

Open your terminal (or Command Prompt/PowerShell on Windows) and SSH into your server:

```bash
ssh user@your-vps-ip-address
# Enter password or use SSH key
```

### Step 2: Clone the Repository

Navigate to where you want the app to live (e.g., `/opt` or `~/apps`) and clone your code.

```bash
# Create a directory (optional)
mkdir -p ~/apps
cd ~/apps

# Clone your repository (Replace with your actual repo URL)
git clone https://github.com/your-username/marcus-backend-nestjs.git

# Enter the project folder
cd marcus-backend-nestjs
```

### Step 3: Configure Environment Variables (`.env`)

You need to create a `.env` file on the VPS. This is **CRITICAL** for connecting to the local Postgres and Redis containers.

#### 1. Common Confusion: GitHub Secrets vs. .env

- **Question**: "Do I need to add secrets to GitHub?"
- **Answer**: **NO.** Since you are doing a manual "Clone & Build", GitHub Secrets are not used. GitHub Secrets are only for automated pipelines (GitHub Actions).
- **Question**: "Do I type secrets in the console?"
- **Answer**: **NO.** You create a file named `.env` once, and Docker reads it automatically.

#### 2. Create the file

Run this command on your VPS:

```bash
nano .env
```

#### 3. Paste this EXACT configuration (Edit passwords/keys)

Copy the block below, paste it into your terminal, and **change the values marked with `<...>`**.

```env
# ==============================================
#  DATABASE CONFIG (Internal Docker Connection)
# ==============================================
# connects to the 'postgres' container (not localhost, not Neon)
DATABASE_URL="postgresql://postgres:mysecurepassword@postgres:5432/marcus_db?schema=public"

# These must match the credentials in DATABASE_URL above
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mysecurepassword
POSTGRES_DB=marcus_db

# ==============================================
#  REDIS CONFIG (Internal Docker Connection)
# ==============================================
# Connects to 'redis' container.
# NOTE: We use 'redis://' (not 'rediss://') for internal docker network.
REDIS_URL="redis://redis:6379"

# (Legacy/Optional - only if your code uses them specifically, otherwise REDIS_URL is enough)
REDIS_HOST=redis
REDIS_PORT=6379

# ==============================================
#  APP CONFIG
# ==============================================
PORT=3000
# Generate a random string for this (e.g., run `openssl rand -hex 32` locally)
JWT_SECRET="<YOUR_SUPER_SECURE_RANDOM_SECRET>"

# ==============================================
#  EXTERNAL SERVICES (Copy from your local .env)
# ==============================================
# These don't change because they are external APIs
SMTP_USER=<YOUR_GMAIL_ADDRESS>
SMTP_PASS=<YOUR_APP_PASSWORD>
SUPABASE_URL=<YOUR_SUPABASE_URL>
SUPABASE_ANON_KEY=<YOUR_SUPABASE_KEY>
```

#### 4. Save and Exit

- Press `Ctrl + O` then `Enter` (to save).
- Press `Ctrl + X` (to exit).

### Step 4: Run the Application

Now, use Docker Compose to build and start everything.

```bash
# -d: Detached mode (runs in background)
# --build: Rebuilds the images to ensure you have the latest code
docker compose up -d --build
```

**What happens next?**

1.  Docker downloads Postgres and Redis images.
2.  Docker builds your NestJS app image.
3.  It starts all three services (`marcus-app`, `marcus-postgres`, `marcus-redis`).
4.  It automatically runs `npx prisma migrate deploy` to set up your database tables (defined in `compose.yaml`).

---

## 4. Verification

Check if everything is running:

```bash
docker compose ps
```

You should see 3 containers with status `Up`.

View the application logs to ensure no errors:

```bash
docker compose logs -f app
```

(Press `Ctrl + C` to exit logs).

---

## 5. Updating the App (Future)

When you make changes to your code and push them to GitHub, follow these steps to update the VPS:

1.  **Pull the changes**:
    ```bash
    git pull origin main
    ```
2.  **Rebuild and Restart**:
    ```bash
    docker compose up -d --build
    ```

---

## 6. Troubleshooting

**"Connection refused" to Database?**

- Ensure `DATABASE_URL` uses `postgres` as the hostname, not `localhost`. Inside Docker, `localhost` refers to the container itself, not the neighbor container.

**App restarting constantly?**

- Check logs: `docker compose logs app`.
- Ensure migrations passed. If not, you might need to run them manually:
  ```bash
  docker compose exec app npx prisma migrate deploy
  ```
