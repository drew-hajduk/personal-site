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
- PAYgrade appears with one static screenshot and a customer quote. The demo video and a step-by-step product tour were both removed as too promotional.
- Photos: `drew-portrait.jpg` (event photo, homepage hero) and `drew-headshot.jpg` (headshot, Work with me page).
- Only the Knowledge & Expertise level descriptors are public. Never publish screenshots or text showing descriptors for other PAYgrade factors, weightings or scoring logic.
- Services are on `/work-with-me/`, productised with exact inclusions and exclusions. Two levels only (no Lead level; Drew doesn't have time for a day a week): Advisor, £1,500 a month + VAT (about 6 hours: one 90-minute session a month, up to 2 focused reviews between sessions, email replies within 2 working days, written notes) and Partner, £2,500 a month + VAT (about 2 days: a 90-minute session every two weeks, up to 4 focused reviews, email replies within 1 working day, notes, prioritised list, quarterly one-page roadmap). Both include onboarding; bigger reviews such as full specs are agreed separately. Lead magnet: free 45-minute product review session plus a written note of the top three actions within 2 working days, a few each month, booked through the contact form. A "What's not included" list (hands-on design, code, whole-system audits, project management, acting as head of product, hiring or managing staff, delivery responsibility, legal or pay advice, selling, extra time) is part of the offer. Don't mention billing in advance or unused time on the site. Places per quarter not yet decided: say "a small number of clients each quarter". Design and development are done by the client's team, or by trusted partners Drew introduces who contract directly with the client and are responsible for their own delivery. Drew provides oversight, never delivery responsibility: avoid wording like "sign off", "own the launch", "one package" or anything implying he answers for delays or defects. Prices live in `templates/work-with-me.html` and the `OFFERS` list in `build.js`; keep both in step.
- Customer quotes: Laura Allam (Orders of St John Care Trust) for PAYgrade, Samantha Perry (David Lloyd) for PAYreview. Keep wording exactly as given.

## Design system

- Tokens are at the top of `public/styles.css`: muted green accent, cool off-white paper, light and dark themes. Fonts: Bricolage Grotesque (display), Geist (body), Geist Mono (labels).
- No scroll indicators: the evaluation scale sidebar and the top progress line were removed at Drew's request. Don't add them back.
- Buttons and calls to action share one high-contrast style: lime fill (`--cta`), dark text (`--cta-ink`) and a dark edge (`--cta-edge`, lime in dark mode). Use `.button` (or a `<button>`) for every call to action; don't style one-off buttons. Text links share one style: green (`--accent`) and underlined, darkening on hover, inline or as `.more` (mono, for standalone links like "All writing →"). Only the menu, brand, buttons and the writing list rows are exempt.
- Motion is scroll-linked and subtle, and is switched off for reduced-motion users. Don't add showy effects.
- Every page must work at phone width with no sideways scrolling.
- Menu: section links (About, Products, Writing, Contact) scroll the homepage; "Work with me" is the main call to action, styled as a button at the end of the menu, and goes to `/work-with-me/`.

## Articles

- One a month. Each is a Markdown file in `content/articles/`, based on `_template.md`.
- List format with numbered points suits AI citation. Each point heading should make sense quoted on its own. Include an `inShort` answer near the top.
- Articles should show Drew's product and design thinking, not only HR knowledge. "For product teams" takeaways are the established pattern.
- Use specific dates rather than "this year".

## Free resources

- `/resources/` lists free resources from `content/resources.json` (title, summary, type, url, pdf, updated). Everything is ungated: no email forms in front of resources, so search engines and AI assistants can read them.
- The glossary lives in `content/resources/glossary.md` (`## Section`, then `### Term` and a plain-English definition). Each term gets its own link and DefinedTerm structured data.
- Each resource has a web page and a PDF in `public/downloads/`. After changing a resource, run `python3 tools/make_pdfs.py` to regenerate the PDFs (needs Playwright and Chromium) and commit them. Update the `updated` date in `resources.json`.
- Nothing in resources may reveal PAYgrade's framework, descriptors, weightings or scoring. Generic, publicly known methods are fine.

## Making changes

- Run `node build.js` and check the output in `dist/` before committing.
- Prefer working on a branch and opening a pull request so Drew can check the preview link Cloudflare builds before it goes live. Small fixes can go straight to `master` if Drew asks.
- `site.json` holds the site address and LinkedIn URL.
- Contact form secrets (`TURNSTILE_SECRET`, `CONTACT_TO`) live in the Worker's **Runtime variables and secrets** in the Cloudflare dashboard, type Secret, never in the repo and never in Build variables. `/api/contact/status` reports which settings are missing (names only).
- Hosting: Cloudflare Workers with static assets (`wrangler.jsonc` publishes `dist`). Build command `npm run build`, deploy command `npx wrangler deploy`.
