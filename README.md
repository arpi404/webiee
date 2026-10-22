# Webiee & Guestbook Backend

A cute retro cyber-shrine site with a persistent live guestbook!

## Running Locally

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```
   Or for auto-reloading during development:
   ```bash
   npm run dev
   ```

3. Open **`http://localhost:3001`** in your browser.

---

## Backend Features (`server.js`)

- **Persistent Storage**: All guestbook messages are safely stored in [`data/guestbook.json`](file:///Users/arpiii/Downloads/webiee/data/guestbook.json) with atomic writes to prevent data corruption.
- **REST API Endpoints**:
  - `GET /api/guestbook` — Fetches all live guestbook entries.
  - `POST /api/guestbook` — Submits a new entry (with HTML sanitization, character limits, and spam rate-limiting).
  - `POST /api/guestbook/:id/like` — Increments the like counter for any entry.
  - `GET /api/health` — Service health check.
- **Frontend Real-time Sync**: The frontend polls for new entries every 15 seconds so messages signed by other visitors show up automatically.
- **Offline / Local Fallback**: If the backend is temporarily offline, the frontend seamlessly falls back to `localStorage` so the UI never crashes or errors.

---

## Deploying Online (So Anyone Can Sign)

To let anyone on the internet visit your site and sign the guestbook permanently:

### Option 1: Render.com (Recommended & Free)
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Set:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Deploy Web Service** — Render will give you a public URL (e.g., `https://your-site.onrender.com`) where anyone can sign the guestbook!

### Option 2: Railway.app
1. Link your GitHub repo to [Railway.app](https://railway.app).
2. Railway will automatically detect `server.js` and deploy it instantly.
