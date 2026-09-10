/* ANTIGONE — site configuration.
   Everything environment-specific lives here. Edit this file, not the others. */

window.ANTIGONE = window.ANTIGONE || {};

window.ANTIGONE.config = {
  /* GitHub organisation that owns the site and gates access. */
  org: "antigone-horizoneu",

  /* Public repository: serves the site and holds all PUBLIC content. */
  publicRepo: "antigone-horizoneu.github.io",

  /* Private repository: holds all PRIVATE content. Create it inside the org
     and keep it private. Never put private material in the public repo. */
  privateRepo: "antigone-private",

  branch: "main",

  /* Where the private repo keeps its JSON. */
  privateDataDir: "data",

  /* Collections managed by the site. */
  collections: ["people", "projects", "tools", "publications", "media", "events", "datasets"],

  /* Where "Request access" sends people. */
  accessRequestRepo: "antigone-horizoneu/antigone-horizoneu.github.io",
  accessRequestLabel: "access-request",

  /* Token scope guidance shown in the sign-in dialog. */
  tokenDocsUrl: "https://github.com/settings/personal-access-tokens/new"
};
