#!/usr/bin/env python3
"""Assembles the whole site into one self-contained HTML file for preview.

The real site is many pages served by GitHub Pages. An Artifact is a single
page, so this inlines the stylesheet, the scripts, the public JSON and the
images, turns the page bodies into hash-routed sections, and shims the reads
that would otherwise hit the filesystem. It reads the same sources as
build.sh, so the preview cannot drift from the site by hand."""

import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
B = ROOT / ".build"

PAGES = [
    ("index", "Project"),
    ("consortium", "Consortium"),
    ("people", "People"),
    ("projects", "Projects"),
    ("tools", "Research tools"),
    ("publications", "Publications"),
    ("media", "Media"),
    ("datasets", "Datasets"),
]

def read(p):
    return (ROOT / p).read_text()

def data_uri(path, mime):
    raw = (ROOT / path).read_bytes()
    return "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode())

FLAG = data_uri("assets/img/eu-flag.svg", "image/svg+xml")

# Fonts cannot be fetched from a relative path inside an Artifact, so the faces
# the page actually renders with are embedded. The rest are dropped along with
# their @font-face rules, which keeps the preview from silently 404ing.
PREVIEW_FONTS = {"Otto-Regular", "Otto-Italic", "Otto-Medium", "Otto-Bold",
                 "National-Regular", "National-Medium", "National-Bold"}


def inline_fonts(css):
    def face(block):
        urls = re.findall(r'url\("\.\./fonts/([^"]+)"\)', block)
        if not urls:
            return block
        keep = []
        for u in urls:
            stem = u.rsplit(".", 1)[0]
            if stem not in PREVIEW_FONTS or not (ROOT / "assets/fonts" / u).exists():
                continue
            mime = "font/woff2" if u.endswith(".woff2") else "font/woff"
            keep.append((u, data_uri("assets/fonts/" + u, mime)))
        if not keep:
            return ""
        src = ", ".join('url("%s") format("%s")'
                        % (uri, "woff2" if u.endswith(".woff2") else "woff")
                        for u, uri in keep)
        return re.sub(r"src:[^;]+;", "src: %s;" % src.replace("\\", "\\\\"), block, count=1)

    return re.sub(r"@font-face \{[^}]*\}", lambda m: face(m.group(0)), css)

def relink(html):
    """index.html -> #index, and point the two inlined images at their data URIs."""
    html = re.sub(r'href="([a-z0-9-]+)\.html"', lambda m: 'href="#%s"' % m.group(1), html)
    html = html.replace('src="assets/img/eu-flag.svg"', 'src="%s"' % FLAG)
    return html

# --- header and footer, stripped of the build placeholders -------------------

head = read(".build/head.tpl")
header = head[head.index("<header"):head.index("<main")]
header = re.sub(r"__CUR_[A-Z]+__", "", header)
header = relink(header)

foot = read(".build/foot.tpl")
footer = foot[foot.index("<footer"):foot.index("</footer>") + len("</footer>")]
footer = relink(footer)

# --- page bodies -------------------------------------------------------------

sections = []
for slug, _label in PAGES:
    body = relink(read(".build/body-%s.html" % slug))
    sections.append('<div class="page" data-page="%s" hidden>%s</div>' % (slug, body))

# --- public data, inlined ----------------------------------------------------

inline = {}
for name in ["site", "consortium", "pages", "people", "projects", "tools",
             "publications", "media", "datasets"]:
    inline[name] = json.loads(read("data/%s.json" % name))

# --- assemble ----------------------------------------------------------------

out = """<title>ANTIGONE</title>
<style>
%(css)s

/* --- preview-only ------------------------------------------------------- */
.page[hidden] { display: none !important; }
.preview-note {
  background: var(--accent); color: #fff;
  font-family: var(--font-head); font-size: .78rem; letter-spacing: .02em;
  padding: .6rem var(--gutter); text-align: center; line-height: 1.45;
}
.preview-note a { color: var(--accent-yellow); }
.preview-note strong { font-weight: 700; }
</style>

<div class="preview-note">
  Preview of the ANTIGONE site. Every public page is here and the navigation works.
  <strong>Sign-in stays inactive until the two GitHub repositories exist</strong> — see SETUP.md.
</div>

%(header)s
<main id="main">
%(sections)s
</main>
%(footer)s

<script>window.ANTIGONE_INLINE = %(data)s;</script>
<script>%(config)s</script>
<script>%(gh)s</script>
<script>%(auth)s</script>
<script>%(store)s</script>
<script>
/* Preview shim: the site normally fetches these JSON files over HTTP.
   Here they ship inside the page, so serve them from memory instead.
   Writes still go to the real GitHub API and are untouched. */
(function () {
  var A = window.ANTIGONE, D = window.ANTIGONE_INLINE;
  var overrides = {};
  A.store.fetchPublic = function (name) {
    var live = overrides[name];
    return Promise.resolve(live || D[name] || { items: [] });
  };
  A.store.site = function () { return Promise.resolve(D.site); };
  A.store.consortium = function () { return Promise.resolve(D.consortium); };
  A.store.fetchBlocks = function () { return Promise.resolve((D.pages && D.pages.blocks) || {}); };
})();
</script>
<script>%(ui)s</script>
<script>%(app)s</script>
<script>
/* Hash router standing in for the eight separate HTML files. */
(function () {
  var pages = %(slugs)s;
  function show() {
    var id = (location.hash || "#index").slice(1) || "index";
    if (pages.indexOf(id) === -1) id = "index";
    document.querySelectorAll("[data-page]").forEach(function (p) {
      p.hidden = p.dataset.page !== id;
    });
    document.querySelectorAll('.site-nav a').forEach(function (a) {
      if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var nav = document.querySelector(".site-nav");
    if (nav) nav.setAttribute("data-open", "false");
    document.title = "ANTIGONE";
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", show);
  document.addEventListener("DOMContentLoaded", show);
  if (document.readyState !== "loading") show();
})();
</script>
""" % {
    "css": inline_fonts(read("assets/css/site.css")),
    "header": header,
    "footer": footer,
    "sections": "\n".join(sections),
    "data": json.dumps(inline, ensure_ascii=False),
    "config": read("assets/js/config.js"),
    "gh": read("assets/js/gh.js"),
    "auth": read("assets/js/auth.js"),
    "store": read("assets/js/store.js"),
    "ui": read("assets/js/ui.js"),
    "app": read("assets/js/app.js"),
    "slugs": json.dumps([p[0] for p in PAGES]),
}

dest = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / ".build" / "preview.html")
dest.write_text(out)
print("wrote %s  (%.0f KB)" % (dest, dest.stat().st_size / 1024))
