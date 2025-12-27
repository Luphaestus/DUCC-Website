# DUCC Website

An open-source, modern web application for the **Durham University Canoe Club (DUCC)**. This project handles event management, membership tracking, and administrative tasks for the club.

## 🚀 Features

-   **Event Management:** Weekly calendar view, event sign-ups, and attendee limits.
-   **Membership Tracking:** Automatic tracking of membership status, free sessions, and club debts.
-   **User Profiles:** Secure profiles with legal/medical info management.
-   **Admin Dashboard:** Comprehensive tools for managing users, events, tags, and global system settings.
-   **Responsive Design:** Fully mobile-friendly interface using [PicoCSS](https://picocss.com/).
-   **Automated HTTPS:** Integrated Caddy server for automatic SSL certificate management.

## 🛠 Tech Stack

-   **Backend:** Node.js, Express.js
-   **Database:** SQLite (with `sqlite3` and `sqlite` wrapper)
-   **Authentication:** Passport.js (Local Strategy)
-   **Styling:** SASS, PicoCSS (Material Design principles)
-   **Infrastructure:** Docker, Podman, Caddy
-   **Testing:** Jest, Supertest

## 💻 Getting Started

### Prerequisites
-   Node.js (v20+)
-   npm
-   Docker (or Podman)

### Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Initialize the database:**
    ```bash
    npm run db:init
    ```

3.  **Run in development mode:**
    ```bash
    npm run dev
    ```
    The site will be available at `http://localhost:3000`.

## 🧪 Testing

The project uses Jest for unit and integration testing.

-   **Run all tests:**
    ```bash
    npm test
    ```
    *Note: This automatically runs `pretest` to set up a clean `database.test.db`.*

## 🚢 Deployment

The project includes a robust deployment script (`deploy.sh`) designed for DigitalOcean Droplets (or any Linux server).

### Setup
Create a `.env.deploy` file in the root directory:
```env
DROPLET_IP=your_server_ip
DROPLET_PASSWORD=your_server_password
DOMAIN_NAME=your_domain.com
```

### Deployment Commands
-   **Standard Production Deploy:**
    ```bash
    ./deploy.sh
    ```
-   **Deploy in Dev Mode (with test data):**
    ```bash
    ./deploy.sh --dev
    ```
-   **Clear Remote Database & Deploy:**
    ```bash
    ./deploy.sh --clear
    ```
-   **View Remote Logs:**
    ```bash
    ./deploy.sh --logs
    ```

## 📂 Project Structure

-   `public/`: Frontend assets (JS, CSS, Images).
-   `server/`: Backend logic.
    -   `api/`: REST API route definitions.
    -   `db/`: Database drivers and initialization logic.
-   `src/`: SASS source files.
-   `tests/`: Jest test suites.
-   `Dockerfile` & `docker-compose.yml`: Containerization configuration.
-   `Caddyfile`: Reverse proxy and HTTPS configuration.

## 📄 License

This project is licensed under the **Apache-2.0 License**.