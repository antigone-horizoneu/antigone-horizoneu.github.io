# Setting up the ANTIGONE site

One-time work for an administrator of the
[antigone-horizoneu](https://github.com/antigone-horizoneu) organisation.
Budget about twenty minutes.

---

## 1. Create the two repositories

Both live inside the `antigone-horizoneu` organisation.

**Public** — `antigone-horizoneu.github.io`, visibility **public**.
The site and everything already published. Naming it after the organisation
gives you `https://antigone-horizoneu.github.io` with no path prefix.

**Private** — `antigone-private`, visibility **private**.
Unpublished datasets, drafts, anything not yet for the world. Add one folder,
`data/`, with a placeholder file so the folder exists.

If you prefer other names, change `publicRepo` and `privateRepo` in
[`assets/js/config.js`](assets/js/config.js) to match.

## 2. Push the site

From this directory:

```bash
git init -b main
git add .
git commit -m "ANTIGONE project site"
git remote add origin git@github.com:antigone-horizoneu/antigone-horizoneu.github.io.git
git push -u origin main
```

## 3. Turn on Pages

In the public repository: **Settings → Pages → Source: Deploy from a branch**,
branch `main`, folder `/ (root)`. The site appears at
`https://antigone-horizoneu.github.io` within a few minutes.

## 4. Seed the private repository

In `antigone-private`, create `data/datasets.json` containing:

```json
{ "updated": "2026-09-10", "items": [] }
```

The site creates `people.json`, `projects.json`, `publications.json` and
`media.json` there by itself the first time someone saves a private item.

## 5. Decide who can do what

Permissions on **`antigone-private`** are what the site reads.

| Give them | They become |
|---|---|
| Write, Maintain or Admin | Editor — can add, edit, publish, delete |
| Read or Triage | Viewer — sees private material, changes nothing |
| Nothing | Public site only |

Editors also need **Write on the public repository** in order to publish
anything or to edit the site's own text. Give the same people write access to
both. Teams work well here: an `editors` team with write on both repositories,
a `members` team with read on the private one.

## 6. Add the trial fonts

Drop the font files into `assets/fonts/` following
[`assets/fonts/README.md`](assets/fonts/README.md). Check the trial licence
before the site goes public. Without the files the site falls back to system
faces and still looks deliberate.

---

## How a member signs in

1. They create a GitHub account themselves, choosing their own username and
   password. ANTIGONE never sees either.
2. An administrator invites them to the organisation and to `antigone-private`
   at the right level.
3. On the site they click **Members**, then follow the four steps in the dialog
   to create a fine-grained personal access token: resource owner
   `antigone-horizoneu`, repository permissions **Contents: Read and write** and
   **Metadata: Read-only**.
4. They paste the token. The site checks it against GitHub, works out their
   role, and keeps the token in their browser only.

Someone without access gets a **Request access** tab, which opens a pre-filled
issue on the public repository labelled `access-request`. Watch that label.

## What happens when someone edits

Every change is a commit to one of the two repositories, authored by the person
who made it. Nothing is lost: `git log` and the repository's history are the
audit trail, and a bad change can be reverted like any other commit.

Publishing moves an item from the private repository to the public one. An item
is never in both, so the public repository cannot leak anything unpublished.

Public changes go live once GitHub Pages rebuilds, normally under a minute.

## Access to consider revoking

Tokens expire on the date the member chose when creating them, and they stop
working the moment you remove that person's repository access. Removing someone
from the organisation is enough — there is no separate account on the site to
delete.

---

## Limits worth knowing

**Anyone with read access to the private repository can read every private
item.** GitHub permissions are per repository, not per item. If some material
needs to be narrower than that, put it in a third repository rather than trying
to hide it inside the site.

**Two editors saving the same collection within the same few seconds** will
produce a conflict; the second save fails with a GitHub error and can simply be
repeated. This is rare in practice for a project of this size.

**A token is as powerful as its permissions.** A token scoped to Contents on
these two repositories can do nothing else to the organisation, which is why the
dialog asks for exactly that and no more.

**Site text edited in the browser** is stored in `data/pages.json` and overrides
the matching text in the HTML. To go back to the original wording, delete that
key from `pages.json`.

## An optional improvement

Pasting a token is secure but not elegant. A proper *Sign in with GitHub*
button needs one small server-side function to exchange the OAuth code for a
token, because the client secret cannot live in a public repository. A free
Cloudflare Worker or Vercel function of about forty lines is enough. The rest of
the site would not change: `auth.js` would receive a token the same way it does
now. Worth doing if the consortium finds the token step off-putting.
