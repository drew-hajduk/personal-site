# Working on this site

This is Drew Hajduk's personal website, published at https://drewhajduk.co.uk. Read this file before making changes. See README.md for how the build works.

## What the site is for

- To promote Drew as a product designer and businessman, not to promote PAYgrade. Product mentions should support his credibility, never read as product marketing.
- Main audience: people who want help building HR, pay or reward software. Secondary: HR and reward professionals.
- A key goal is being found and cited by AI assistants (ChatGPT, Perplexity, Claude, Gemini) as well as search engines.

## Facts about Drew

- Drew Hajduk, UK-based, proudly up North (North of England).
- HR software product designer and founder. Founded and launched PAYgrade (job evaluation and salary banding platform, around 25 organisations) and PAYreview (pay review software).
- Company MD with 16 years in the design industry. A product designer by trade who now leads rather than designs hands-on: describe him as an HR software product leader, never as someone doing hands-on design. Covers design direction, product strategy and continuous development, secure and reliable software (with technical and security partners), and building businesses. Runs other businesses alongside client work, so capacity is limited.
- LinkedIn: https://www.linkedin.com/in/drew-hajduk/
- Do not invent biography, clients, numbers or claims. Ask Drew if something is needed.

## Voice and copy rules

- British English spelling.
- Never use em dashes in copy.
- Confident and experienced, not boastful and not self-deprecating. Credit teams and partners. Avoid lines like "still learning".
- Plain, specific language. No generic marketing filler or formulaic phrasing.
- When drafting text in Drew's voice that he didn't write, tell him which parts are new so he can check them.

## Decisions already made

- No email address anywhere on the site or in the repo (spam). Contact is a form (Cloudflare Turnstile plus a Worker in `worker/index.js` that forwards to email, recipient held in the `CONTACT_TO` secret) with a LinkedIn link alongside. Setup is in README.md.
- PAYgrade appears with one static screenshot, a customer quote and the demo video. A step-by-step product tour was tried and removed as too promotional.
- Only the Knowledge & Expertise level descriptors are public. Never publish screenshots or text showing descriptors for other PAYgrade factors, weightings or scoring logic.
- Services are on `/work-with-me/`: fractional product leadership only, at Advisor (about 1 day a month, £1,500 a month), Partner (2 days a month, £2,500) and Lead (1 day a week, £4,000). No fixed-price projects or sprints; Drew doesn't do day-to-day delivery. Design is done by the client's team or trusted partners Drew directs. Prices live in `templates/work-with-me.html` and the `OFFERS` list in `build.js`; keep both in step.
- Customer quotes: Laura Allam (Orders of St John Care Trust) for PAYgrade, Samantha Perry (David Lloyd) for PAYreview. Keep wording exactly as given.

## Design system

- Tokens are at the top of `public/styles.css`: muted green accent, cool off-white paper, light and dark themes. Fonts: Bricolage Grotesque (display), Geist (body), Geist Mono (labels).
- Signature element: the job evaluation scale (5.0 to 10.0 with half steps) down the left edge, used as the scroll indicator. Keep it.
- Motion is scroll-linked and subtle, and is switched off for reduced-motion users. Don't add showy effects.
- Every page must work at phone width with no sideways scrolling.

## Articles

- One a month. Each is a Markdown file in `content/articles/`, based on `_template.md`.
- List format with numbered points suits AI citation. Each point heading should make sense quoted on its own. Include an `inShort` answer near the top.
- Articles should show Drew's product and design thinking, not only HR knowledge. "For product teams" takeaways are the established pattern.
- Use specific dates rather than "this year".

## Making changes

- Run `node build.js` and check the output in `dist/` before committing.
- Prefer working on a branch and opening a pull request so Drew can check the preview link Cloudflare builds before it goes live. Small fixes can go straight to `master` if Drew asks.
- `site.json` holds the site address and LinkedIn URL.
- Contact form secrets (`TURNSTILE_SECRET`, `CONTACT_TO`) live in the Worker's **Runtime variables and secrets** in the Cloudflare dashboard, type Secret, never in the repo and never in Build variables. `/api/contact/status` reports which settings are missing (names only).
- Hosting: Cloudflare Workers with static assets (`wrangler.jsonc` publishes `dist`). Build command `npm run build`, deploy command `npx wrangler deploy`.
