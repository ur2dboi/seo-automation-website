# SEO Automation OS Dashboard

A full-stack SEO/GEO automation dashboard prototype.

## Included features

1. **Backend dashboard** using Node's built-in HTTP server.
2. **Login/accounts** with a demo protected session.
3. **Client projects database** stored in `data/db.json`.
4. **Automated technical audits** for crawlability, HTTPS, title, meta description, H1 count, canonical, viewport, schema, image alt attributes, and keyword-map coverage.
5. **Weekly audit schedule records** ready to connect to a real cron/worker.
6. **Google Search Console, GA4, Bing, PageSpeed, Ahrefs, Semrush, and GBP integration placeholders** for credentials/account IDs.
7. **Keyword cluster mapper** with simple intent inference and URL assignment.
8. **SEO asset generators** for `sitemap.xml`, `robots.txt`, and JSON-LD schema.
9. **PDF-ready SEO reports** via browser Print > Save as PDF.
10. **GEO / AI-search optimization workspace** with entity profile templates.

## Run locally

```bash
cd seo-automation-website
node server.js
```

Open:

```text
http://localhost:3000
```

Demo login:

```text
Email: demo@example.com
Password: demo123
```

## Notes

Full automation of Google Search Console, GA4, Bing Webmaster Tools, Ahrefs/Semrush, PageSpeed Insights, and Google Business Profile requires real API credentials, OAuth consent, verified properties, and provider-specific API permissions. This prototype includes the architecture and UI needed to connect those services.
