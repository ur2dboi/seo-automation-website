const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const sessions = new Map();

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: [{ id: 'u_demo', name: 'Demo User', email: 'demo@example.com', password: 'demo123' }],
      projects: [{
        id: id('prj'), name: 'Example Brand', url: 'https://example.com', niche: 'SEO automation services',
        createdAt: now(), keywords: [
          { cluster: 'Technical SEO automation', intent: 'Commercial', primary: 'technical seo automation', url: '/services/technical-seo-automation/' },
          { cluster: 'SEO audit software', intent: 'Commercial', primary: 'seo audit software', url: '/seo-audit-software/' },
          { cluster: 'Generative AI SEO', intent: 'Informational', primary: 'generative ai search optimization', url: '/blog/generative-ai-search-optimization/' }
        ]
      }],
      audits: [],
      schedules: [],
      integrations: { gsc: {}, ga4: {}, bing: {}, pagespeed: {}, semrush: {}, ahrefs: {}, gbp: {} }
    }, null, 2));
  }
}
function db() { ensureDb(); return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function save(next) { fs.writeFileSync(DB_FILE, JSON.stringify(next, null, 2)); }
function id(prefix='id') { return prefix + '_' + crypto.randomBytes(6).toString('hex'); }
function now() { return new Date().toISOString(); }
function json(res, code, payload) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); }
function text(res, code, payload, type='text/plain') { res.writeHead(code, { 'Content-Type': type }); res.end(payload); }
function parseBody(req) { return new Promise((resolve) => { let data=''; req.on('data', c => data += c); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } }); }); }
function getCookie(req, name) { return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.split('=')[1]; }
function userFromReq(req) { const sid = getCookie(req, 'seo_sid'); return sessions.get(sid); }
function auth(req, res) { const user = userFromReq(req); if (!user) { json(res, 401, { error: 'Unauthorized' }); return null; } return user; }
function maskSecrets(obj) { const out = {}; for (const [k,v] of Object.entries(obj || {})) out[k] = v ? String(v).slice(0,3) + '••••' + String(v).slice(-2) : ''; return out; }

async function fetchHtml(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'SEOAutomationOS/2.0' }});
    clearTimeout(timer);
    const html = await res.text();
    return { ok: res.ok, status: res.status, html: html.slice(0, 900000), error: null };
  } catch (e) {
    return { ok: false, status: 0, html: '', error: e.message };
  }
}
function extract(html, re) { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; }
function count(html, re) { return (html.match(re) || []).length; }
function scoreItem(pass, weight, title, detail, recommendation) { return { pass, weight, title, detail, recommendation, impact: weight >= 12 ? 'High' : weight >= 8 ? 'Medium' : 'Low' }; }
function buildLocalChecks(project, fetched) {
  const html = fetched.html || '';
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta = extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const h1Count = count(html, /<h1\b/gi);
  const canonical = /rel=["']canonical["']/i.test(html);
  const viewport = /name=["']viewport["']/i.test(html);
  const schema = /application\/ld\+json/i.test(html);
  const images = count(html, /<img\b/gi);
  const imagesMissingAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;
  const checks = [];
  checks.push(scoreItem(fetched.ok, 12, 'Crawlable homepage', fetched.ok ? `Fetched with HTTP ${fetched.status}.` : `Could not fetch URL: ${fetched.error || fetched.status}.`, 'Verify DNS, hosting, robots.txt, and firewall rules.'));
  checks.push(scoreItem(project.url.startsWith('https://'), 12, 'HTTPS enforced', project.url.startsWith('https://') ? 'Project URL uses HTTPS.' : 'Project URL is not HTTPS.', 'Install/renew SSL and redirect HTTP to HTTPS.'));
  checks.push(scoreItem(title.length > 10 && title.length <= 60, 10, 'Optimized title tag', title ? `${title.length} characters: ${title}` : 'No title tag detected.', 'Use a unique title under 60 characters with the primary keyword near the front.'));
  checks.push(scoreItem(meta.length > 50 && meta.length <= 160, 9, 'Meta description', meta ? `${meta.length} characters.` : 'No meta description detected.', 'Write a CTR-focused description under 160 characters with a clear benefit.'));
  checks.push(scoreItem(h1Count === 1, 10, 'Single H1 heading', `${h1Count} H1 tags detected.`, 'Use exactly one H1 per indexable page.'));
  checks.push(scoreItem(canonical, 8, 'Canonical tag present', canonical ? 'Canonical tag detected.' : 'No canonical tag detected.', 'Add a self-referential canonical or master canonical URL.'));
  checks.push(scoreItem(viewport, 8, 'Mobile viewport configured', viewport ? 'Viewport meta tag detected.' : 'Viewport tag missing.', 'Add a responsive viewport tag for mobile-first indexing.'));
  checks.push(scoreItem(schema, 8, 'Structured data present', schema ? 'JSON-LD structured data detected.' : 'No JSON-LD detected.', 'Add Organization, WebSite, Article, FAQ, Product, or LocalBusiness schema where appropriate.'));
  checks.push(scoreItem(imagesMissingAlt === 0, 7, 'Image alt text coverage', `${imagesMissingAlt} of ${images} images appear to be missing alt attributes.`, 'Add descriptive alt text that naturally supports topical relevance.'));
  checks.push(scoreItem((project.keywords || []).length > 0, 9, 'Keyword clusters mapped', `${(project.keywords || []).length} keyword clusters saved.`, 'Map each primary cluster to one unique URL to prevent cannibalization.'));
  return { title, meta, h1Count, checks };
}
function calculateScore(checks) { const max = checks.reduce((a,c) => a + c.weight, 0); const got = checks.reduce((a,c) => a + (c.pass ? c.weight : 0), 0); return Math.round((got / max) * 100); }
function genSitemap(project) {
  const base = project.url.replace(/\/$/, '');
  const urls = ['/', ...(project.keywords || []).map(k => k.url || '/')].filter((v,i,a) => a.indexOf(v) === i);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${base}${u.startsWith('/') ? u : '/' + u}</loc>\n    <lastmod>${new Date().toISOString().slice(0,10)}</lastmod>\n    <changefreq>${u === '/' ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${u === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n')}\n</urlset>`;
}
function genRobots(project) { return `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /private/\nDisallow: /search?\n\nSitemap: ${project.url.replace(/\/$/, '')}/sitemap.xml`; }
function genSchema(project) { return `<script type="application/ld+json">\n${JSON.stringify({ '@context':'https://schema.org', '@type':'Organization', name: project.name, url: project.url, description: project.niche, knowsAbout: (project.keywords || []).map(k => k.cluster) }, null, 2)}\n<\/script>`; }
function genReportHtml(audit, project) {
  const rows = audit.checks.map(c => `<tr><td>${c.pass ? '✅' : '⚠️'}</td><td>${esc(c.title)}</td><td>${esc(c.impact)}</td><td>${esc(c.detail)}</td><td>${esc(c.recommendation)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>SEO Report - ${esc(project.name)}</title><style>body{font-family:Arial,sans-serif;margin:36px;color:#172033}h1{font-size:34px} .score{font-size:56px;font-weight:800;color:#0d8f68}table{width:100%;border-collapse:collapse;margin-top:22px}td,th{border:1px solid #dfe5ef;padding:10px;text-align:left;vertical-align:top}th{background:#f5f7fb}.muted{color:#667085}@media print{button{display:none}}</style></head><body><button onclick="print()">Save as PDF</button><h1>SEO Automation Report</h1><p class="muted">${esc(project.name)} — ${esc(project.url)} — ${esc(audit.createdAt)}</p><div class="score">${audit.score}/100</div><h2>Audit Findings</h2><table><thead><tr><th>Status</th><th>Check</th><th>Impact</th><th>Detail</th><th>Recommendation</th></tr></thead><tbody>${rows}</tbody></table><h2>Generated Assets</h2><h3>Sitemap.xml</h3><pre>${esc(genSitemap(project))}</pre><h3>Robots.txt</h3><pre>${esc(genRobots(project))}</pre></body></html>`;
}
function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const server = http.createServer(async (req, res) => {
  ensureDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const store = db();
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await parseBody(req);
      const user = store.users.find(u => u.email === body.email && u.password === body.password);
      if (!user) return json(res, 401, { error: 'Invalid email or password. Use demo@example.com / demo123' });
      const sid = id('sid'); sessions.set(sid, { id: user.id, name: user.name, email: user.email });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `seo_sid=${sid}; HttpOnly; Path=/; SameSite=Lax` });
      return res.end(JSON.stringify({ user: { id: user.id, name: user.name, email: user.email } }));
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') { const sid = getCookie(req, 'seo_sid'); sessions.delete(sid); res.writeHead(200, {'Set-Cookie':'seo_sid=; Max-Age=0; Path=/'}); return res.end('{}'); }
    const user = auth(req, res); if (!user) return;
    if (req.method === 'GET' && url.pathname === '/api/me') return json(res, 200, { user });
    if (req.method === 'GET' && url.pathname === '/api/projects') return json(res, 200, { projects: store.projects, audits: store.audits.slice(-10), schedules: store.schedules, integrations: Object.fromEntries(Object.entries(store.integrations).map(([k,v]) => [k, maskSecrets(v)])) });
    if (req.method === 'POST' && url.pathname === '/api/projects') {
      const body = await parseBody(req);
      const project = { id: id('prj'), name: body.name || 'Untitled Project', url: body.url || 'https://example.com', niche: body.niche || '', createdAt: now(), keywords: [] };
      store.projects.push(project); save(store); return json(res, 200, { project });
    }
    if (req.method === 'PUT' && url.pathname.startsWith('/api/projects/')) {
      const pid = url.pathname.split('/')[3]; const body = await parseBody(req); const p = store.projects.find(x => x.id === pid); if (!p) return json(res, 404, { error: 'Project not found' });
      Object.assign(p, body, { id: p.id }); save(store); return json(res, 200, { project: p });
    }
    if (req.method === 'POST' && url.pathname === '/api/keywords/cluster') {
      const body = await parseBody(req);
      const pid = body.projectId; const p = store.projects.find(x => x.id === pid); if (!p) return json(res, 404, { error: 'Project not found' });
      const seeds = String(body.keywords || '').split(/[\n,]/).map(x => x.trim()).filter(Boolean);
      p.keywords = seeds.map((kw, i) => ({ cluster: kw.replace(/\b\w/g, m => m.toUpperCase()), primary: kw.toLowerCase(), intent: inferIntent(kw), url: '/' + slug(kw) + '/' }));
      save(store); return json(res, 200, { keywords: p.keywords });
    }
    if (req.method === 'POST' && url.pathname === '/api/audit/run') {
      const body = await parseBody(req); const p = store.projects.find(x => x.id === body.projectId); if (!p) return json(res, 404, { error: 'Project not found' });
      const fetched = await fetchHtml(p.url); const local = buildLocalChecks(p, fetched); const audit = { id: id('aud'), projectId: p.id, createdAt: now(), score: calculateScore(local.checks), checks: local.checks, extracted: { title: local.title, meta: local.meta, h1Count: local.h1Count }, source: fetched.ok ? 'live-fetch' : 'fallback-fetch-failed' };
      store.audits.push(audit); save(store); return json(res, 200, { audit });
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations') {
      const body = await parseBody(req); store.integrations[body.provider] = body.config || {}; save(store); return json(res, 200, { provider: body.provider, saved: maskSecrets(store.integrations[body.provider]) });
    }
    if (req.method === 'POST' && url.pathname === '/api/schedule') {
      const body = await parseBody(req); const schedule = { id: id('sch'), projectId: body.projectId, frequency: body.frequency || 'weekly', day: body.day || 'Monday', enabled: true, createdAt: now() };
      store.schedules = store.schedules.filter(s => s.projectId !== body.projectId); store.schedules.push(schedule); save(store); return json(res, 200, { schedule });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/assets/')) {
      const [, , , pid, type] = url.pathname.split('/'); const p = store.projects.find(x => x.id === pid); if (!p) return json(res,404,{error:'Project not found'});
      if (type === 'sitemap') return text(res, 200, genSitemap(p), 'application/xml');
      if (type === 'robots') return text(res, 200, genRobots(p));
      if (type === 'schema') return text(res, 200, genSchema(p), 'text/html');
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/report/')) {
      const aid = url.pathname.split('/')[3]; const audit = store.audits.find(a => a.id === aid); if (!audit) return text(res,404,'Report not found'); const p = store.projects.find(x => x.id === audit.projectId); return text(res, 200, genReportHtml(audit, p), 'text/html');
    }
    return json(res, 404, { error: 'API route not found' });
  }
  let file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const filePath = path.normalize(path.join(PUBLIC, file));
  if (!filePath.startsWith(PUBLIC)) return text(res, 403, 'Forbidden');
  fs.readFile(filePath, (err, data) => {
    if (err) return text(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    const type = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.svg':'image/svg+xml' }[ext] || 'application/octet-stream';
    text(res, 200, data, type);
  });
});
function inferIntent(kw) { kw = kw.toLowerCase(); if (/buy|price|pricing|near me|service|agency|software|tool/.test(kw)) return 'Commercial'; if (/how|what|why|guide|tips|example/.test(kw)) return 'Informational'; if (/login|brand|contact/.test(kw)) return 'Navigational'; return 'Informational'; }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
server.listen(PORT, () => console.log(`SEO Automation OS running at http://localhost:${PORT}`));
