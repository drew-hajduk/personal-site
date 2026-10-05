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

// Resources helpers
const resources = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/resources.json'), 'utf8'));
const hasFile = p => !!p && fs.existsSync(path.join(ROOT, 'public', p));
const slugify = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const downloadLink = pdf => hasFile(pdf) ? `<p class="download"><a class="more" href="${pdf}" download>Download as PDF ↓</a></p>` : '';

// Article pages
for (const a of articles) {
  const bodyHtml = blocks(a.body.split('\n'), a);
  const words = a.body.replace(/[#:*\[\]()>-]/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.description,
    datePublished: a.date, dateModified: a.updated || a.date, inLanguage: 'en-GB',
    author: { '@type': 'Person', name: 'Drew Hajduk', jobTitle: 'Founder and HR Software Product Leader', sameAs: [site.linkedin], ...(siteUrl ? { url: siteUrl + '/' } : {}) },
    ...(a.topics ? { about: a.topics.split(',').map(s => s.trim()) } : {}),
    ...(a.image ? { image: abs(a.image) } : {}),
    ...(siteUrl ? { mainEntityOfPage: `${siteUrl}/articles/${a.slug}/` } : {}),
  };
  const inShort = a.inShort ? `    <div class="in-short">\n      <p class="eyebrow">In short</p>\n      <p>${inline(a.inShort)}</p>\n    </div>` : '';
  const page = fill(tpl('article.html'), {
    nav: navFor(false), footer, eyebrow: esc(a.eyebrow || 'Writing'), title: esc(a.title),
    standfirst: inline(a.standfirst || a.summary), dateISO: a.date, dateLong: longDate(a.date), readingTime: minutes,
    inShort, body: bodyHtml, linkedin: site.linkedin, download: downloadLink(a.pdf),
  });
  const extra = `<meta name="author" content="Drew Hajduk">\n<meta property="article:published_time" content="${a.date}">\n`;
  write(`articles/${a.slug}/index.html`,
    head({ title: `${a.title} · Drew Hajduk`, ogTitle: a.title, description: a.description, ogType: 'article', image: a.image, urlPath: `/articles/${a.slug}/`, extraHead: extra })
    + page + `\n<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>\n</body>\n</html>\n`);
}

// Homepage
const homeBody = fill(tpl('home.html'), {
  nav: navFor(true), footer, linkedin: site.linkedin, turnstileSiteKey: site.turnstileSiteKey || '',
  writing: articles.slice(0, 3).map(writingItem).join('\n'),
});
write('index.html', head({ title: site.homeTitle, description: site.homeDescription, ogType: 'profile', urlPath: '/' })
  + homeBody + '\n' + tpl('home-ld.html') + '</body>\n</html>\n');

// All writing page
const listPage = `<div class="wrap">
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

// Glossary
const glossary = (() => {
  const raw = fs.readFileSync(path.join(ROOT, 'content/resources/glossary.md'), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('glossary.md needs settings between --- lines at the top.');
  const g = {};
  for (const line of m[1].split('\n')) { const kv = line.match(/^(\w+):\s*(.*)$/); if (kv) g[kv[1]] = kv[2].trim(); }
  const sections = []; let cur = null, term = null;
  for (const line of m[2].split('\n')) {
    const h2 = line.match(/^##\s+(.*)$/), h3 = line.match(/^###\s+(.*)$/);
    if (h2) { cur = { title: h2[1].trim(), intro: [], terms: [] }; sections.push(cur); term = null; continue; }
    if (h3) { if (!cur) throw new Error('glossary.md: a "### term" must come after a "## section".'); term = { name: h3[1].trim(), lines: [] }; cur.terms.push(term); continue; }
    if (term) term.lines.push(line.trim()); else if (cur) cur.intro.push(line.trim());
  }
  const paras = lines => lines.join('\n').split(/\n{2,}/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);
  const plain = t => t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, '');
  const pageUrl = '/resources/glossary/';
  const count = sections.reduce((n, sec) => n + sec.terms.length, 0);
  const toc = sections.map(sec => `        <li><a href="#${slugify(sec.title)}">${esc(sec.title)}</a></li>`).join('\n');
  const html = sections.map(sec => `    <section class="glossary-section" id="${slugify(sec.title)}">
      <h2>${esc(sec.title)}</h2>
${paras(sec.intro).map(p => `      <p class="section-intro">${inline(p)}</p>`).join('\n')}
      <dl class="glossary">
${sec.terms.map(t => `        <div id="${slugify(t.name)}"><dt><a class="term-link" href="#${slugify(t.name)}">${esc(t.name)}</a></dt>${paras(t.lines).map(p => `<dd>${inline(p)}</dd>`).join('')}</div>`).join('\n')}
      </dl>
    </section>`).join('\n\n');
  const ld = {
    '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: g.title, description: g.description, inLanguage: 'en-GB', dateModified: g.updated,
    ...(siteUrl ? { url: abs(pageUrl) } : {}), author: { '@type': 'Person', name: 'Drew Hajduk', sameAs: [site.linkedin] },
    hasDefinedTerm: sections.flatMap(sec => sec.terms.map(t => ({ '@type': 'DefinedTerm', name: t.name, description: plain(paras(t.lines).join(' ')), ...(siteUrl ? { url: abs(`${pageUrl}#${slugify(t.name)}`) } : {}) }))),
  };
  const res = resources.find(r => r.url === pageUrl);
  write('resources/glossary/index.html', head({ title: `${g.title} · Drew Hajduk`, ogTitle: g.title, description: g.description, ogType: 'article', urlPath: pageUrl })
    + fill(tpl('glossary.html'), { nav: navFor(false), footer, title: esc(g.title), standfirst: inline(g.standfirst), updatedISO: g.updated, updatedLong: longDate(g.updated), count, download: downloadLink(res && res.pdf), inShort: inline(g.inShort), toc, sections: html, linkedin: site.linkedin })
    + `\n<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>\n</body>\n</html>\n`);
  return { ...g, count, url: pageUrl };
})();

// Resources page
const resourceItem = r => `      <li class="resource">
        <p class="offer-meta">${esc(r.type)} · Updated ${shortDate(r.updated)}</p>
        <h2><a href="${r.url}">${esc(r.title)}</a></h2>
        <p>${esc(r.summary)}</p>
        <p class="link-row"><a class="more" href="${r.url}">Read online →</a>${hasFile(r.pdf) ? `<a class="more" href="${r.pdf}" download>Download PDF ↓</a>` : ''}</p>
      </li>`;
write('resources/index.html', head({ title: 'Free resources · Drew Hajduk', description: 'Free guides, checklists and references for product teams building pay, reward and HR software, from Drew Hajduk.', ogType: 'website', urlPath: '/resources/' })
  + fill(tpl('resources.html'), { nav: navFor(false), footer, items: resources.map(resourceItem).join('\n') }) + '</body>\n</html>\n');

// llms.txt
const llmsArticles = '## Articles\n\n' + articles.map(a => `- [${a.title}](${abs(`/articles/${a.slug}/`)}): ${a.summary}`).join('\n') + '\n';
const llmsResources = '## Free resources\n\n' + resources.map(r => `- [${r.title}](${abs(r.url)}): ${r.summary}${hasFile(r.pdf) ? ` PDF: ${abs(r.pdf)}` : ''}`).join('\n') + '\n';
const links = `## Links\n\n- LinkedIn: ${site.linkedin}\n`;
const outro = tpl('llms-outro.md').replace(/## Links[\s\S]*$/, '').trimEnd();
write('llms.txt', [tpl('llms-intro.md').trimEnd(), llmsResources, llmsArticles, outro, links].join('\n\n'));

// robots.txt
const bots = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];
write('robots.txt', '# Search engines and AI assistants are welcome to read this site.\nUser-agent: *\nAllow: /\n\n'
  + bots.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n')
  + (siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''));

// Sitemap and RSS need the real web address, set as "url" in site.json
if (siteUrl) {
  const urls = [['/', articles[0]?.date], ['/articles/', articles[0]?.date], ['/resources/', null], ['/resources/glossary/', glossary.updated], ...articles.map(a => [`/articles/${a.slug}/`, a.updated || a.date])];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(([p, d]) => `  <url><loc>${siteUrl}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n');
  write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`
    + `  <title>Drew Hajduk · Writing</title>\n  <link>${siteUrl}/articles/</link>\n  <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>\n`
    + `  <description>Articles by Drew Hajduk on HR software, job evaluation, pay and reward, and product design.</description>\n  <language>en-gb</language>\n`
    + articles.map(a => `  <item>\n    <title>${esc(a.title)}</title>\n    <link>${siteUrl}/articles/${a.slug}/</link>\n    <guid>${siteUrl}/articles/${a.slug}/</guid>\n    <pubDate>${rssDate(a.date)}</pubDate>\n    <description>${esc(a.description)}</description>\n  </item>`).join('\n')
    + '\n</channel>\n</rss>\n');
}

console.log(`Built ${articles.length} article(s) into dist/${siteUrl ? '' : ' (add "url" to site.json to also build the sitemap and RSS feed)'}`);
