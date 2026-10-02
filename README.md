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

- `url`: the full web address once the domain is live, for example `https://drewhajduk.com`. Setting it turns on the sitemap, the RSS feed (`/feed.xml`) and full links for search engines and social sharing.
- `email`: the contact email shown on the homepage.
- `linkedin`: your LinkedIn profile.

## Changing the homepage or design

- Homepage text: `templates/home.html`
- Top bar, footer and evaluation scale: `templates/nav.html`, `templates/footer.html`, `templates/rail.html`
- Article page layout: `templates/article.html`
- Styles: `public/styles.css`
- Images and anything else copied as-is: `public/`

## Building and checking locally (optional)

With Node.js 18 or later installed, run `node build.js`. The finished site appears in `dist/`.

## Cloudflare Pages settings

Connect this repository to a Cloudflare Pages project with:

- Framework preset: None
- Build command: `node build.js`
- Build output directory: `dist`
