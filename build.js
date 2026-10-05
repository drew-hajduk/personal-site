// Builds the site into dist/. No dependencies: run with `node build.js`.
// Articles live in content/articles/*.md. See README.md for the format.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const siteUrl = (site.url || '').replace(/\/+$/, '');
const tpl = name => fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');
const fill = (s, vars) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = p => (siteUrl ? siteUrl + p : p);

// ---------- Markdown (the subset described in README.md) ----------
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, href) => {
    const ext = /^https?:/.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s;
}

function findClose(lines, start) {
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === ':::') { if (depth === 0) return i; depth--; }
    else if (t.startsWith(':::')) depth++;
  }
  throw new Error(`Unclosed ":::" block starting near: ${lines[start - 1]}`);
}

function blocks(lines, ctx) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }

    if (t.startsWith(':::')) {
      const [name, ...rest] = t.slice(3).trim().split(' ');
      const args = rest.join(' ').trim();
      const end = findClose(lines, i + 1);
      out.push(container(name, args, lines.slice(i + 1, end), ctx));
      i = end + 1; continue;
    }
    const h = t.match(/^(#{2,4})\s+(.*)$/);
    if (h) { const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }

    if (/^[-*]\s/.test(t)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, '')); i++; }
      const checks = items.every(x => /^\[ ?\]\s/.test(x));
      const lis = items.map(x => `<li>${inline(checks ? x.replace(/^\[ ?\]\s+/, '') : x)}</li>`).join('\n');
      out.push(checks ? `<ul class="checks">\n${lis}\n</ul>` : `<ul>\n${lis}\n</ul>`); continue;
    }
    if (/^\d+\.\s/.test(t)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++; }
      out.push(`<ol>\n${items.map(x => `<li>${inline(x)}</li>`).join('\n')}\n</ol>`); continue;
    }
    if (t.startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) { q.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote><p>${inline(q.join(' '))}</p></blockquote>`); continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(:::|#{2,4}\s|[-*]\s|\d+\.\s|>)/.test(lines[i].trim())) { para.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

function container(name, args, lines, ctx) {
  if (name === 'points') {
    const groups = [];
    for (const l of lines) {
      const m = l.trim().match(/^##\s+(.*)$/);
      if (m) groups.push({ title: m[1], lines: [] });
      else if (groups.length) groups[groups.length - 1].lines.push(l);
      else if (l.trim()) throw new Error('Text inside :::points must come after a "## " heading.');
    }
    const label = ctx.pointLabel || 'Point';
    const items = groups.map((g, n) => {
      const num = String(n + 1).padStart(2, '0');
      return `<li class="point" data-label="${esc(label)} ${n + 1}">\n<span class="num">${num}</span>\n<div>\n<h2>${inline(g.title)}</h2>\n${blocks(g.lines, ctx)}\n</div>\n</li>`;
    });
    return `<ol class="points">\n${items.join('\n')}\n</ol>`;
  }
  if (name === 'takeaway') {
    return `<p class="takeaway"><span>${esc(args || 'Takeaway')}</span>${inline(lines.map(l => l.trim()).filter(Boolean).join(' '))}</p>`;
  }
  if (name === 'quote') {
    const [who, role] = args.split('|').map(s => (s || '').trim());
    let text = lines.map(l => l.trim()).filter(Boolean).join(' ');
    if (!/^[“"]/.test(text)) text = `“${text}”`;
    const cap = who ? `<figcaption><strong>${esc(who)}</strong>${role ? ' · ' + esc(role) : ''}</figcaption>` : '';
    return `<figure class="quote">\n<blockquote>${inline(text)}</blockquote>\n${cap}\n</figure>`;
  }
  throw new Error(`Unknown block ":::${name}". Use points, takeaway or quote.`);
}

function parseFile(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${path.basename(file)} needs settings between --- lines at the top.`);
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  for (const req of ['title', 'description', 'date', 'summary']) {
    if (!data[req]) throw new Error(`${path.basename(file)} is missing "${req}:" in its settings.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error(`${path.basename(file)}: date must look like 2026-10-02.`);
  return { ...data, slug: path.basename(file, '.md'), body: m[2] };
}

// ---------- Helpers ----------
const longDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const rssDate = d => new Date(d + 'T09:00:00Z').toUTCString();
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const footer = tpl('footer.html').trimEnd();
const rail = tpl('rail.html').trimEnd();
const navFor = isHome => fill(tpl('nav.html').trimEnd(), { home: isHome ? '' : '/', brandLink: isHome ? '#top' : '/' });

function head({ title, ogTitle, description, ogType, image, urlPath, extraHead = '' }) {
  return fill(tpl('head.html'), {
    title: esc(title), ogTitle: esc(ogTitle || title), description: esc(description), ogType,
    ogImage: abs(image || '/drew-portrait.jpg'),
    canonical: siteUrl ? `<link rel="canonical" href="${siteUrl}${urlPath}">\n` : '',
    extraHead,
  });
}
const writingItem = a => `      <li><a href="/articles/${a.slug}/"><time datetime="${a.date}">${shortDate(a.date)}</time><strong>${esc(a.title)}</strong><span>${esc(a.summary)}</span></a></li>`;

// ---------- Build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });

const articles = fs.readdirSync(path.join(ROOT, 'content/articles'))
  .filter(f => f.endsWith('.md') && !f.startsWith('_'))
  .map(f => parseFile(path.join(ROOT, 'content/articles', f)))
  .filter(a => a.draft !== 'true')
  .sort((a, b) => b.date.localeCompare(a.date));

// Article pages
for (const a of articles) {
  const bodyHtml = blocks(a.body.split('\n'), a);
  const words = a.body.replace(/[#:*\[\]()>-]/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.description,
    datePublished: a.date, dateModified: a.updated || a.date, inLanguage: 'en-GB',
    author: { '@type': 'Person', name: 'Drew Hajduk', jobTitle: 'HR Software Product Leader and Founder', sameAs: [site.linkedin], ...(siteUrl ? { url: siteUrl + '/' } : {}) },
    ...(a.topics ? { about: a.topics.split(',').map(s => s.trim()) } : {}),
    ...(a.image ? { image: abs(a.image) } : {}),
    ...(siteUrl ? { mainEntityOfPage: `${siteUrl}/articles/${a.slug}/` } : {}),
  };
  const inShort = a.inShort ? `    <div class="in-short">\n      <p class="eyebrow">In short</p>\n      <p>${inline(a.inShort)}</p>\n    </div>` : '';
  const page = fill(tpl('article.html'), {
    rail, nav: navFor(false), footer, eyebrow: esc(a.eyebrow || 'Writing'), title: esc(a.title),
    standfirst: inline(a.standfirst || a.summary), dateISO: a.date, dateLong: longDate(a.date), readingTime: minutes,
    inShort, body: bodyHtml, linkedin: site.linkedin,
  });
  const extra = `<meta name="author" content="Drew Hajduk">\n<meta property="article:published_time" content="${a.date}">\n`;
  write(`articles/${a.slug}/index.html`,
    head({ title: `${a.title} · Drew Hajduk`, ogTitle: a.title, description: a.description, ogType: 'article', image: a.image, urlPath: `/articles/${a.slug}/`, extraHead: extra })
    + page + `\n<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>\n</body>\n</html>\n`);
}

// Homepage
const homeBody = fill(tpl('home.html'), {
  rail, nav: navFor(true), footer, linkedin: site.linkedin, turnstileSiteKey: site.turnstileSiteKey || '',
  writing: articles.slice(0, 3).map(writingItem).join('\n'),
});
write('index.html', head({ title: site.homeTitle, description: site.homeDescription, ogType: 'profile', urlPath: '/' })
  + homeBody + '\n' + tpl('home-ld.html') + '</body>\n</html>\n');

// All writing page
const listPage = `${rail}
<div class="wrap">
${navFor(false)}
  <section class="col" style="max-width:none" data-label="Writing">
    <p class="eyebrow">Writing</p>
    <h2>Notes on pay, grading and product.</h2>
    <ul class="writing">
${articles.map(writingItem).join('\n')}
    </ul>
  </section>
${footer}
</div>
`;
write('articles/index.html', head({ title: 'Writing · Drew Hajduk', description: 'Articles by Drew Hajduk on HR software, job evaluation, pay and reward, and product design.', ogType: 'website', urlPath: '/articles/' })
  + listPage + '</body>\n</html>\n');

// Work with me page
const OFFERS = [
  { name: 'Free product review session', price: 0, unit: null, description: 'A free 45-minute video call reviewing an HR software product, prototype or plans, with the three things to fix or decide first.' },
  { name: 'Fractional product support: Advisor', price: 1500, unit: 'MON', description: 'About one day a month: monthly strategy session, review of plans and answers to questions within 2 working days.' },
  { name: 'Fractional product support: Partner', price: 2500, unit: 'MON', description: 'Two days a month: roadmap and priority decisions, reviews of the team\'s designs and builds.' },
  { name: 'Fractional product support: Lead', price: 4000, unit: 'MON', description: 'One day a week as fractional head of product: direction, planning, directing designers and developers, launch plan.' },
];
const wwmDesc = 'Fractional product leadership for teams building pay, reward and HR software, at three levels of involvement, from Drew Hajduk, founder of PAYgrade and PAYreview.';
const wwmLd = {
  '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'Drew Hajduk: fractional product leadership for HR software',
  description: wwmDesc, areaServed: 'GB', ...(siteUrl ? { url: `${siteUrl}/work-with-me/` } : {}),
  founder: { '@type': 'Person', name: 'Drew Hajduk', sameAs: [site.linkedin] },
  hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Services', itemListElement: OFFERS.map(o => ({
    '@type': 'Offer', itemOffered: { '@type': 'Service', name: o.name, description: o.description },
    priceSpecification: { '@type': 'UnitPriceSpecification', price: o.price, priceCurrency: 'GBP', ...(o.unit ? { unitCode: o.unit } : {}) },
  })) },
};
write('work-with-me/index.html', head({ title: 'Work with me · Drew Hajduk', ogTitle: 'Fractional product leadership for HR software', description: wwmDesc, ogType: 'website', image: '/drew-headshot.jpg', urlPath: '/work-with-me/' })
  + fill(tpl('work-with-me.html'), { rail, nav: navFor(false), footer })
  + `\n<script type="application/ld+json">\n${JSON.stringify(wwmLd, null, 2)}\n</script>\n</body>\n</html>\n`);

// llms.txt
const llmsArticles = '## Articles\n\n' + articles.map(a => `- [${a.title}](${abs(`/articles/${a.slug}/`)}): ${a.summary}`).join('\n') + '\n';
const llmsOffers = '## Services\n\n' + OFFERS.map(o => `- ${o.name}${o.price ? ': £' + o.price.toLocaleString('en-GB') + (o.unit ? ' a month' : '') : ''}. ${o.description}`).join('\n') + `\n\nDrew leads the work rather than doing it hands-on; design and development are done by the client's team or trusted partners he directs. He takes on a small number of clients each quarter. Details: ${abs('/work-with-me/')}\n`;
const links = `## Links\n\n- LinkedIn: ${site.linkedin}\n`;
const outro = tpl('llms-outro.md').replace(/## Links[\s\S]*$/, '').trimEnd();
write('llms.txt', [tpl('llms-intro.md').trimEnd(), llmsOffers, llmsArticles, outro, links].join('\n\n'));

// robots.txt
const bots = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];
write('robots.txt', '# Search engines and AI assistants are welcome to read this site.\nUser-agent: *\nAllow: /\n\n'
  + bots.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n')
  + (siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''));

// Sitemap and RSS need the real web address, set as "url" in site.json
if (siteUrl) {
  const urls = [['/', articles[0]?.date], ['/articles/', articles[0]?.date], ['/work-with-me/', null], ...articles.map(a => [`/articles/${a.slug}/`, a.updated || a.date])];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(([p, d]) => `  <url><loc>${siteUrl}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n');
  write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`
    + `  <title>Drew Hajduk · Writing</title>\n  <link>${siteUrl}/articles/</link>\n  <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>\n`
    + `  <description>Articles by Drew Hajduk on HR software, job evaluation, pay and reward, and product design.</description>\n  <language>en-gb</language>\n`
    + articles.map(a => `  <item>\n    <title>${esc(a.title)}</title>\n    <link>${siteUrl}/articles/${a.slug}/</link>\n    <guid>${siteUrl}/articles/${a.slug}/</guid>\n    <pubDate>${rssDate(a.date)}</pubDate>\n    <description>${esc(a.description)}</description>\n  </item>`).join('\n')
    + '\n</channel>\n</rss>\n');
}

console.log(`Built ${articles.length} article(s) into dist/${siteUrl ? '' : ' (add "url" to site.json to also build the sitemap and RSS feed)'}`);
