# TinyLink – URL Shortener

TinyLink is a simple and lightweight URL shortener similar to bit.ly.  
Users can create short links, view click statistics, delete links, and manage everything from a clean dashboard.

This project is built using **Node.js, Express, PostgreSQL, and EJS**.

---

## ✨ Features

- Create short links with automatic or custom codes (6–8 characters)
- 302 redirect from `/:code` → target URL
- Track:
  - Total clicks
  - Last clicked time
  - Created time
- Dashboard for:
  - Creating links
  - Viewing all links
  - Searching links
  - Deleting links
- Stats page for each link (`/code/:code`)
- REST API:
  - `POST /api/links`
  - `GET /api/links`
  - `GET /api/links/:code`
  - `DELETE /api/links/:code`
- Healthcheck endpoint (`/healthz`)
- Clean UI using EJS + CSS

---

## 🧱 Tech Stack

- **Backend:** Node.js (Express)
- **Database:** PostgreSQL
- **Templating:** EJS
- **Styling:** CSS
- **Other:** pg, dotenv, morgan, cors

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ganeshrupanwar/Tinylink.git
cd Tinylink
