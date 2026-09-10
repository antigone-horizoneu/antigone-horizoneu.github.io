/* ANTIGONE — content store.

   Public items live in  <publicRepo>/data/<collection>.json  and are fetched
   as plain files, so the public site works with no token and no JavaScript
   privileges at all.

   Private items live in <privateRepo>/data/<collection>.json and are fetched
   through the GitHub API using the signed-in person's own token. An item is
   in exactly one of the two files, so publishing is a move, and the public
   repository never contains anything unpublished. */

(function () {
  "use strict";

  var A = window.ANTIGONE;
  var cfg = A.config;

  var base = (function () {
    var s = document.querySelector('script[src$="assets/js/config.js"]');
    if (!s) return "";
    return s.getAttribute("src").replace(/assets\/js\/config\.js.*$/, "");
  })();

  var publicCache = {};

  function emptyFile() { return { updated: today(), items: [] }; }

  function today() { return new Date().toISOString().slice(0, 10); }

  function uid() {
    return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function pubPath(name) { return "data/" + name + ".json"; }
  function privPath(name) { return cfg.privateDataDir + "/" + name + ".json"; }

  function stamp(items, visibility) {
    return (items || []).map(function (it) {
      var copy = Object.assign({}, it);
      copy.visibility = visibility;
      return copy;
    });
  }

  function byDateDesc(a, b) {
    var x = a.date || a.addedAt || "";
    var y = b.date || b.addedAt || "";
    if (x === y) return (a.title || a.name || "").localeCompare(b.title || b.name || "");
    return y.localeCompare(x);
  }

  var store = {
    base: base,

    /* --- reads ---------------------------------------------------------- */

    fetchPublic: function (name, force) {
      if (!force && publicCache[name]) return Promise.resolve(publicCache[name]);
      return fetch(base + pubPath(name) + "?v=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : emptyFile(); })
        .catch(function () { return emptyFile(); })
        .then(function (data) {
          publicCache[name] = data && data.items ? data : emptyFile();
          return publicCache[name];
        });
    },

    fetchPrivate: function (name) {
      if (!A.auth.isSignedIn()) return Promise.resolve(emptyFile());
      return A.auth.client()
        .getFile(cfg.org, cfg.privateRepo, privPath(name), cfg.branch)
        .then(function (f) {
          if (!f) return emptyFile();
          try { return JSON.parse(f.text); } catch (e) { return emptyFile(); }
        })
        .catch(function () { return emptyFile(); });
    },

    /* Everything the current viewer is allowed to see, newest first. */
    load: function (name, opts) {
      opts = opts || {};
      return Promise.all([
        store.fetchPublic(name, opts.force),
        opts.publicOnly ? Promise.resolve(emptyFile()) : store.fetchPrivate(name)
      ]).then(function (r) {
        var items = stamp(r[0].items, "public").concat(stamp(r[1].items, "private"));
        items.sort(byDateDesc);
        return items;
      });
    },

    /* --- writes --------------------------------------------------------- */

    _writeFile: function (which, name, mutate, message) {
      var gh = A.auth.client();
      var repo = which === "public" ? cfg.publicRepo : cfg.privateRepo;
      var path = which === "public" ? pubPath(name) : privPath(name);

      return gh.getFile(cfg.org, repo, path, cfg.branch).then(function (f) {
        var data = emptyFile();
        if (f) {
          try { data = JSON.parse(f.text); } catch (e) { data = emptyFile(); }
        }
        if (!Array.isArray(data.items)) data.items = [];
        mutate(data);
        data.updated = today();
        var text = JSON.stringify(data, null, 2) + "\n";
        return gh.putFile(cfg.org, repo, path, text, message, cfg.branch, f && f.sha);
      });
    },

    /* Create or update. `visibility` decides which repo it lands in. */
    save: function (name, item, visibility) {
      if (!A.auth.canEdit()) return Promise.reject(new Error("Editing requires editor access."));
      if (visibility === "public" && !A.auth.canPublish()) {
        return Promise.reject(new Error("Publishing requires write access to the public repository."));
      }

      var record = Object.assign({}, item);
      delete record.visibility;
      var isNew = !record.id;
      if (isNew) {
        record.id = uid();
        record.addedBy = A.auth.user ? A.auth.user.login : "";
        record.addedAt = new Date().toISOString();
      }
      record.updatedAt = new Date().toISOString();
      record.updatedBy = A.auth.user ? A.auth.user.login : "";

      var label = record.title || record.name || record.id;
      var msg = (isNew ? "Add" : "Update") + " " + name.replace(/s$/, "") + ": " + label;

      return store._writeFile(visibility, name, function (data) {
        var i = data.items.findIndex(function (x) { return x.id === record.id; });
        if (i === -1) data.items.unshift(record); else data.items[i] = record;
      }, msg).then(function () {
        publicCache[name] = null;
        return record;
      });
    },

    /* Moves an item between the private and public files. */
    setVisibility: function (name, item, next) {
      if (!A.auth.canEdit()) return Promise.reject(new Error("Editing requires editor access."));
      var current = item.visibility;
      if (current === next) return Promise.resolve(item);
      if (next === "public" && !A.auth.canPublish()) {
        return Promise.reject(new Error("Publishing requires write access to the public repository."));
      }

      var record = Object.assign({}, item);
      delete record.visibility;
      record.updatedAt = new Date().toISOString();
      record.updatedBy = A.auth.user ? A.auth.user.login : "";
      var label = record.title || record.name || record.id;

      return store._writeFile(next, name, function (data) {
        var i = data.items.findIndex(function (x) { return x.id === record.id; });
        if (i === -1) data.items.unshift(record); else data.items[i] = record;
      }, (next === "public" ? "Publish " : "Unpublish ") + name.replace(/s$/, "") + ": " + label)
        .then(function () {
          return store._writeFile(current, name, function (data) {
            data.items = data.items.filter(function (x) { return x.id !== record.id; });
          }, "Move " + label + " out of " + current + " store")
            .catch(function () {
              throw new Error(
                "\u201c" + label + "\u201d was written to the " + next + " store, but removing it " +
                "from the " + current + " store failed. It now appears in both. " +
                "Retry, or delete the stale copy in the " + current + " repository."
              );
            });
        })
        .then(function () {
          publicCache[name] = null;
          record.visibility = next;
          return record;
        });
    },

    remove: function (name, item) {
      if (!A.auth.canEdit()) return Promise.reject(new Error("Editing requires editor access."));
      var label = item.title || item.name || item.id;
      return store._writeFile(item.visibility, name, function (data) {
        data.items = data.items.filter(function (x) { return x.id !== item.id; });
      }, "Remove " + name.replace(/s$/, "") + ": " + label).then(function () {
        publicCache[name] = null;
      });
    },

    /* --- editable page copy --------------------------------------------- */

    fetchBlocks: function () {
      return fetch(base + "data/pages.json?v=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : { blocks: {} }; })
        .catch(function () { return { blocks: {} }; })
        .then(function (d) { return (d && d.blocks) || {}; });
    },

    /* Every changed block goes in one commit, so an editing session leaves a
       single entry in the history rather than one per paragraph. */
    saveBlocks: function (map) {
      var keys = Object.keys(map);
      if (!keys.length) return Promise.resolve();
      if (!A.auth.canPublish()) {
        return Promise.reject(new Error("Editing site text requires write access to the public repository."));
      }
      var gh = A.auth.client();
      return gh.getFile(cfg.org, cfg.publicRepo, "data/pages.json", cfg.branch).then(function (f) {
        var data = { updated: today(), blocks: {} };
        if (f) { try { data = JSON.parse(f.text); } catch (e) {} }
        if (!data.blocks) data.blocks = {};
        keys.forEach(function (k) { data.blocks[k] = map[k]; });
        data.updated = today();
        var msg = keys.length === 1
          ? "Edit site text: " + keys[0]
          : "Edit site text: " + keys.length + " blocks";
        return gh.putFile(
          cfg.org, cfg.publicRepo, "data/pages.json",
          JSON.stringify(data, null, 2) + "\n",
          msg, cfg.branch, f && f.sha
        );
      });
    },

    saveBlock: function (key, html) {
      var one = {};
      one[key] = html;
      return A.store.saveBlocks(one);
    },

    /* --- reference data -------------------------------------------------- */

    site: function () {
      return fetch(base + "data/site.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; });
    },

    consortium: function () {
      return fetch(base + "data/consortium.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : { items: [] }; })
        .catch(function () { return { items: [] }; });
    }
  };

  A.store = store;
})();
