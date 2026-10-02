# Drew Hajduk website

The personal website of Drew Hajduk. It builds into a plain static site with one command and no dependencies.

## Adding a new article

1. Copy `content/articles/_template.md` and rename it. The file name becomes the web address, so `pay-reviews.md` is published at `/articles/pay-reviews/`. Use lowercase words joined with hyphens.
2. Fill in the settings between the `---` lines at the top. `title`, `description`, `date` (as `2026-11-06`) and `summary` are required.
3. Write the article underneath. The formatting you can use is shown in the template and listed below.
4. Delete the `draft: true` line when it's ready to publish. Articles marked as drafts are skipped.
5. Commit the file to GitHub. Cloudflare builds and publishes the site automatically within a minute or two.

The homepage shows your three latest articles, and `/articles/` lists them all. The sitemap, RSS feed and `llms.txt` update themselves.

## Formatting

| You write | You get |
| --- | --- |
| A blank line between paragraphs | Separate paragraphs |
| `## Heading` | A section heading |
| `**bold**`, `*italics*`, `[text](https://link)` | Bold, italics, a link |
| `- item` | A bullet list |
| `- [ ] item` | A checklist with boxes |
| `1. item` | A numbered list |
| `:::points` ... `:::` | A numbered list article. Each `## Heading` inside becomes a numbered point |
| `:::takeaway Label` ... `:::` | A highlighted note, with the label shown above it |
| `:::quote Name \| Role` ... `:::` | A pull quote with a name and role |

Every `:::` block must close with a line containing only `:::`. If something is wrong, the build stops and says which file and what to fix.

## Site settings

`site.json` holds the settings used across the site:

- `url`: the full web address once the domain is live, for example `https://drewhajduk.co.uk`. Setting it turns on the sitemap, the RSS feed (`/feed.xml`) and full links for search engines and social sharing.
- `linkedin`: your LinkedIn profile, used for the contact button.

## Changing the homepage or design

- Homepage text: `templates/home.html`
- Top bar, footer and evaluation scale: `templates/nav.html`, `templates/footer.html`, `templates/rail.html`
- Article page layout: `templates/article.html`
- Styles: `public/styles.css`
- Images and anything else copied as-is: `public/`

## Building and checking locally (optional)

With Node.js 18 or later installed, run `node build.js`. The finished site appears in `dist/`.

## Cloudflare settings

The site deploys as a Cloudflare Worker serving static files. `wrangler.jsonc` tells Cloudflare to publish the `dist` folder. In the Cloudflare project:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

## Contact form setup

The form on the homepage posts to `/api/contact`, handled by the Worker in `worker/index.js`. Spam protection is Cloudflare Turnstile plus a hidden honeypot field, a minimum fill time and length limits. Email is sent through Cloudflare Email Routing, so no email address appears on the site or in this repository.

One-off setup in Cloudflare:

1. **Email Routing**: on the drewhajduk.co.uk zone, enable Email Routing and add the destination address (the one that should receive messages), then confirm the verification email Cloudflare sends to it.
2. **Turnstile**: create a widget for drewhajduk.co.uk (Managed). Put the **site key** in `site.json` as `turnstileSiteKey` (it is public). It currently holds Cloudflare's always-pass test key, so replace it.
3. **Secrets**: in the Worker's settings, add `TURNSTILE_SECRET` (the widget's secret key) and `CONTACT_TO` (the verified destination address). While `TURNSTILE_SECRET` is the test secret `1x0000000000000000000000000000000AA`, the check always passes, so use the real one.
4. `CONTACT_FROM` in `wrangler.jsonc` (`website@drewhajduk.co.uk`) must be on the same domain as Email Routing. Change it there if needed.

Until the secrets exist, the form shows a message pointing people to LinkedIn instead.
