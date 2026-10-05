"""Generate the downloadable PDFs listed in content/resources.json.

Run locally after changing a resource:  python3 tools/make_pdfs.py
Needs Python with Playwright and Chromium. It builds the site, prints each
resource page to PDF in public/downloads/, then rebuilds so the download
links appear. Commit the PDFs along with your changes.
"""
import asyncio, json, os, subprocess, sys, threading, http.server, functools
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8799

def build():
    subprocess.run(['node', 'build.js'], cwd=ROOT, check=True)

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.path.join(ROOT, 'dist'))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

FOOTER = ('<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#5D665A;'
          'padding:0 16mm;display:flex;justify-content:space-between">'
          '<span>Drew Hajduk · drewhajduk.co.uk{path}</span>'
          '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>')

async def main():
    resources = json.load(open(os.path.join(ROOT, 'content', 'resources.json')))
    os.makedirs(os.path.join(ROOT, 'public', 'downloads'), exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        for r in resources:
            if not r.get('pdf'):
                continue
            await page.goto(f"http://127.0.0.1:{PORT}{r['url']}", wait_until='networkidle')
            await page.emulate_media(media='print')
            out = os.path.join(ROOT, 'public', r['pdf'].lstrip('/'))
            await page.pdf(path=out, format='A4', print_background=True, display_header_footer=True,
                           header_template='<span></span>', footer_template=FOOTER.format(path=r['url']),
                           margin={'top': '16mm', 'bottom': '18mm', 'left': '16mm', 'right': '16mm'})
            print('wrote', os.path.relpath(out, ROOT))
        await browser.close()

if __name__ == '__main__':
    build()
    httpd = serve()
    try:
        asyncio.run(main())
    finally:
        httpd.shutdown()
    build()
