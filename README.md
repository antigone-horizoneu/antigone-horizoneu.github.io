# ANTIGONE — project website

Static site for the Horizon Europe project **ANTIGONE** (*from ANTagonIsm to
aGOnism iN digital Ecosystems*, grant agreement 101287848), coordinated by the
Vrije Universiteit Brussel.

It runs on GitHub Pages with no server and no build step. Open `index.html`
locally and it works.

---

## Public mode

Anyone can read the project description, the consortium grid, and any item that
has been published. These pages are plain HTML plus JSON files in `data/`.

## Private mode

There is no application server, so the site cannot run its own login. It uses
GitHub itself as both the identity provider and the permission system:

| Where you stand | What you get |
|---|---|
| Write access to the private repo | **Editor** — read, add, edit, publish, delete |
| Read access to the private repo, or org member | **Viewer** — sees private material, cannot change it |
| Neither | **Public site only** |

Signing in means pasting a GitHub fine-grained personal access token. The token
is kept in the browser and sent only to `api.github.com`. Editing writes commits
to the repositories through the GitHub API, under the signed-in person's own
name, so every change has an author and a history.

**Private material never enters this repository.** It lives in a separate
private repo, and the site fetches it with the reader's own token. Someone
without access does not get a hidden page — the GitHub API refuses them.

See [SETUP.md](SETUP.md) for the one-time setup.

---

## Layout

    index.html … datasets.html   built pages — see .build/
    404.html
    data/
      site.json                  project facts shown on the home page
      consortium.json            the ten partner organisations
      pages.json                 site copy edited in the browser
      people|projects|publications|media|datasets.json   PUBLIC items only
    assets/
      css/site.css               all styling, design tokens at the top
      fonts/                     trial fonts go here — see fonts/README.md
      img/                       favicon, EU emblem, optional partner logos
      js/
        config.js                org and repo names — the only file to edit
        gh.js                    GitHub REST calls
        auth.js                  sign-in and role resolution
        store.js                 reads and writes the JSON collections
        ui.js                    header, sign-in dialog, inline editing
        app.js                   page rendering and editor forms
    .build/                      page templates and the assembler script

## Editing the pages

Header, footer and page bodies are assembled from templates so the navigation
lives in one place. After changing anything in `.build/`:

```bash
zsh .build/build.sh
```

Never hand-edit the generated `*.html` at the root — the next build overwrites
it. Small copy changes do not need a build at all: an editor can click the text
on the live site and rewrite it.

## Running it locally

```bash
python3 -m http.server 8731
```

Then open <http://localhost:8731>. A file server is needed because the pages
fetch JSON; opening the HTML with `file://` will show empty lists.
