# 📚 AkLine — Your Reading Sanctuary

> *Every book finds its reader under the stars.*

AkLine is a web-based book reader platform where users can register, browse books by category, read PDFs directly in the browser, and track their reading progress.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| Frontend | [https://alkine.surge.sh](https://alkine.surge.sh) |

---

## 🗂️ Project Structure

```
EdTechWebsite/
├── front/                  # Frontend (HTML, CSS, JS)
│   ├── index.html          # Login and Register page
│   ├── home.html           # Home page with book categories
│   ├── content.html        # Library page
│   ├── script.js           # Authentication logic (login/register)
│   ├── home.js             # Home page logic
│   ├── content.js          # Library and PDF reader logic
│   ├── style.css           # Login/Register styles
│   ├── home.css            # Home page styles
│   ├── content.css         # Library styles
│   └── res/                # Images
└── back/                   # Backend (Node.js/Express)
    ├── server.js           # Main server file
    ├── package.json
    └── .env                # Environment variables (not committed)
```

---

## ✨ Features

- **User Authentication** — Register, login, and email verification via Resend
- **Admin Panel** — Admins can add and delete books
- **PDF Upload** — Books uploaded to Cloudinary and stored as PDF files
- **PDF Reader** — Built-in browser PDF reader
- **Reading Progress** — Track and save reading progress per book per user
- **Book Categories** — Browse books by Fiction, Non-Fiction, and Literature
- **Responsive Design** — Works on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

### Frontend
- HTML, CSS, JavaScript
- Deployed on **Surge** (`alkine.surge.sh`)

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** (database)
- **Cloudinary** (PDF/file storage)
- **Resend** (email verification)
- Deployed on **Railway**

### Database
- **PostgreSQL** hosted on Railway

---

## 🗃️ Database Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verify_token VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE
);

-- Books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    cover_url TEXT,
    file_url TEXT,
    category VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reading Progress table
CREATE TABLE reading_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER REFERENCES books(id),
    progress NUMERIC,
    UNIQUE(user_id, book_id)
);
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Login a user |
| GET | `/api/verify?token=` | Verify email via token |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Get all users (requires API key) |
| DELETE | `/api/users/:id` | Delete a user |
| PUT | `/api/users/:id` | Update user email or password |

### Books
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/books` | Get all books (public) |
| POST | `/api/books` | Add a book (admin only) |
| DELETE | `/api/books/:id` | Delete a book (admin only) |
| POST | `/api/upload-pdf` | Upload a PDF to Cloudinary (admin only) |

### Progress
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/progress/:userId` | Get reading progress for a user |
| POST | `/api/progress` | Save or update reading progress |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/check-admin/:userId` | Check if a user is admin |

---

## ⚙️ Environment Variables

Create a `.env` file in the `back/` directory:

```env
DATABASE_URL=your_postgresql_connection_string
PORT=3000

# Resend (email verification)
RESEND_API_KEY=your_resend_api_key

# Cloudinary (PDF storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Admin API key
API_KEY=your_secret_api_key
```

---

## 🚀 Running Locally

### Backend
```bash
cd back
npm install
node server.js
```

### Frontend
Open `front/index.html` with Live Server (VS Code extension) or any local server.

Make sure the `API` variable in `script.js`, `home.js`, and `content.js` points to your local backend:
```javascript
const API = 'http://localhost:3000';
```

---

## 🚢 Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Surge | `surge` command in `front/` folder |
| Backend | Railway | Auto-deploys from GitHub on push |
| Database | Railway PostgreSQL | Internal URL used by backend |
| Files | Cloudinary | PDFs stored and served from Cloudinary |
| Email | Resend | Verification emails via `edtech-akline.me` domain |

---

## 👤 Admin Setup

To make a user an admin, run this SQL on your Railway PostgreSQL database:

```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

---

## 📄 License

This project is for educational purposes.
