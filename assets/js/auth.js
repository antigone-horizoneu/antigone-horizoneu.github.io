/* ANTIGONE — sign-in and role resolution.

   There is no server. GitHub itself is the identity provider and the
   authorisation store:

     - the token identifies the person;
     - their permission on the PRIVATE repo decides what they may do.

       write / maintain / admin  ->  editor  (read + create + edit + publish)
       read / triage             ->  viewer  (read private material only)
       no access                 ->  none    (public site only)

   Nothing private is ever shipped in the public repo, so a missing or
   forged token cannot reveal private content: the API simply refuses. */

(function () {
  "use strict";

  var A = window.ANTIGONE;
  var cfg = A.config;
  var KEY = "antigone.token";

  var state = {
    token: null,
    user: null,
    role: "none",
    privatePermission: null,
    canPublish: false,
    orgRole: null,
    ready: false
  };

  var listeners = [];

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { console.error(e); }
    });
    document.documentElement.setAttribute("data-role", state.role);
  }

  function readStoredToken() {
    try {
      return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || null;
    } catch (e) { return null; }
  }

  function storeToken(token, remember) {
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      if (!token) return;
      (remember ? localStorage : sessionStorage).setItem(KEY, token);
    } catch (e) { /* private browsing — session only, in memory */ }
  }

  var auth = {
    get state() { return state; },
    get token() { return state.token; },
    get user() { return state.user; },
    get role() { return state.role; },
    isSignedIn: function () { return state.role !== "none"; },
    canEdit: function () { return state.role === "editor"; },
    canPublish: function () { return state.canPublish; },

    onChange: function (fn) {
      listeners.push(fn);
      if (state.ready) fn(state);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },

    client: function () { return new A.GH(state.token); },

    /* Validates a token and resolves the person's role. Throws on a bad token. */
    signIn: function (token, remember) {
      var gh = new A.GH(token);
      return gh.viewer().then(function (user) {
        return Promise.all([
          gh.repoAccess(cfg.org, cfg.privateRepo),
          gh.repoAccess(cfg.org, cfg.publicRepo),
          gh.orgMembership(cfg.org)
        ]).then(function (r) {
          var priv = r[0], pub = r[1], orgRole = r[2];
          var writeLevels = ["write", "maintain", "admin"];

          var role = "none";
          if (priv.exists && writeLevels.indexOf(priv.permission) !== -1) role = "editor";
          else if (priv.exists) role = "viewer";
          else if (orgRole) role = "viewer";

          if (role === "none") {
            var err = new Error(
              "Signed in as " + user.login + ", but this account has no access to the " +
              cfg.org + " private repository. Request access below."
            );
            err.code = "NO_ACCESS";
            err.login = user.login;
            throw err;
          }

          state.token = token;
          state.user = user;
          state.role = role;
          state.privatePermission = priv.permission;
          state.orgRole = orgRole;
          state.canPublish = pub.exists && writeLevels.indexOf(pub.permission) !== -1;
          state.ready = true;

          storeToken(token, remember);
          emit();
          return state;
        });
      });
    },

    signOut: function () {
      storeToken(null);
      state.token = null;
      state.user = null;
      state.role = "none";
      state.privatePermission = null;
      state.orgRole = null;
      state.canPublish = false;
      state.ready = true;
      emit();
    },

    /* Restores a stored session on page load. Silent on failure. */
    restore: function () {
      var token = readStoredToken();
      if (!token) {
        state.ready = true;
        emit();
        return Promise.resolve(state);
      }
      return auth.signIn(token, !!(function () {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
      })()).catch(function () {
        storeToken(null);
        state.ready = true;
        state.role = "none";
        emit();
        return state;
      });
    },

    accessRequestUrl: function (login) {
      var title = "Access request" + (login ? " — @" + login : "");
      var body = [
        "**GitHub username:** " + (login ? "@" + login : "<your username>"),
        "",
        "**Organisation / partner:** ",
        "",
        "**Role in ANTIGONE:** ",
        "",
        "**Access needed:** viewer (read private material) / editor (add and edit content)",
        "",
        "**Reason:** ",
        "",
        "---",
        "An ANTIGONE administrator will add you to the " + A.config.org +
        " organisation and to the private repository. You will get an email invitation from GitHub."
      ].join("\n");

      return "https://github.com/" + cfg.accessRequestRepo + "/issues/new" +
        "?title=" + encodeURIComponent(title) +
        "&labels=" + encodeURIComponent(cfg.accessRequestLabel) +
        "&body=" + encodeURIComponent(body);
    }
  };

  A.auth = auth;
})();
