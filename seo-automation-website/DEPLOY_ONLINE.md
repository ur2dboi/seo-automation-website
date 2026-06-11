# Deploy SEO Automation OS Online

You can deploy this project online in two ways:

1. **Full dashboard** — Node.js server, login, project storage, audits, reports.
2. **No-API static version** — single HTML file, browser localStorage only.

---

## Option A: Deploy the full dashboard on Render

This is the easiest online hosting option for the Node.js version.

### 1. Create a GitHub repository

Upload the full `seo-automation-website` folder to GitHub.

Your repository should include:

```text
server.js
package.json
public/index.html
public/no-api.html
render.yaml
Procfile
Dockerfile
```

### 2. Create a Render account

Go to:

```text
https://render.com
```

Sign in with GitHub.

### 3. Create a new Web Service

Choose:

```text
New + > Web Service
```

Connect your GitHub repo.

Use these settings:

```text
Environment: Node
Build Command: echo "No build required"
Start Command: node server.js
```

### 4. Add a persistent disk

The app stores projects and audits in a JSON file. Online hosts often reset files unless you add a disk.

In Render, add a disk:

```text
Mount path: /var/data
Size: 1 GB
```

Add environment variable:

```text
DATA_DIR=/var/data
```

The included `render.yaml` already contains this configuration.

### 5. Open your live URL

Render will give you a URL like:

```text
https://seo-automation-os.onrender.com
```

Login:

```text
Email: demo@example.com
Password: demo123
```

The no-API version will also be available at:

```text
https://your-render-url.onrender.com/no-api.html
```

---

## Option B: Deploy the no-API version on Netlify

Use this if you want the simplest online version with no backend.

### 1. Go to Netlify

```text
https://netlify.com
```

### 2. Drag and drop the file

Drag this file into Netlify Drop:

```text
no-api.html
```

Or create a folder with:

```text
index.html
```

To do that, copy `no-api.html` and rename the copy to `index.html`.

### 3. Open the Netlify URL

Netlify will give you a live URL like:

```text
https://your-site-name.netlify.app
```

Important: because this version is no-API, each visitor's data is stored only in that visitor's browser.

---

## Option C: Deploy with Docker

If your host supports Docker:

```bash
docker build -t seo-automation-os .
docker run -p 3000:3000 -v seo-data:/app/data seo-automation-os
```

Then open:

```text
http://localhost:3000
```

For a cloud Docker host, map the service to port `3000` or set the `PORT` environment variable.

---

## Important online notes

- The full dashboard currently uses demo login stored in `data/db.json`.
- For a real public client portal, add proper password hashing, user registration, HTTPS-only cookies, and a database like PostgreSQL, Supabase, or Firebase.
- The no-API version works online as a static website, but all data is stored in each user's browser, not centrally.
- Google Search Console, GA4, Ahrefs, Semrush, Bing, and Google Business Profile still need real credentials if you want live third-party data.
