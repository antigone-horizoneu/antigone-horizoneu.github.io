/* ANTIGONE — thin GitHub REST client.
   Only the handful of endpoints the site actually needs. */

(function () {
  "use strict";

  var API = "https://api.github.com";

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function GH(token) {
    this.token = token || null;
  }

  GH.prototype.request = function (path, options) {
    options = options || {};
    var headers = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (this.token) headers.Authorization = "Bearer " + this.token;
    if (options.body) headers["Content-Type"] = "application/json";

    return fetch(path.indexOf("http") === 0 ? path : API + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.message) || ("GitHub API " + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  };

  /* --- identity --------------------------------------------------------- */

  GH.prototype.viewer = function () {
    return this.request("/user");
  };

  /* Returns { exists, permission } for a repo the viewer can see.
     permission is one of admin | maintain | write | triage | read. */
  GH.prototype.repoAccess = function (owner, repo) {
    return this.request("/repos/" + owner + "/" + repo).then(function (r) {
      var p = (r && r.permissions) || {};
      var permission = p.admin ? "admin"
        : p.maintain ? "maintain"
        : p.push ? "write"
        : p.triage ? "triage"
        : "read";
      return { exists: true, permission: permission, repo: r };
    }).catch(function (err) {
      if (err.status === 404) return { exists: false, permission: null };
      throw err;
    });
  };

  GH.prototype.orgMembership = function (org) {
    return this.request("/user/memberships/orgs/" + org)
      .then(function (m) { return m && m.state === "active" ? m.role : null; })
      .catch(function () { return null; });
  };

  /* --- file contents ---------------------------------------------------- */

  /* Reads a file through the API (works for private repos). Resolves to
     { text, sha } or null when the file does not exist yet. */
  GH.prototype.getFile = function (owner, repo, path, ref) {
    var q = ref ? "?ref=" + encodeURIComponent(ref) : "";
    return this.request("/repos/" + owner + "/" + repo + "/contents/" + path + q)
      .then(function (r) {
        if (!r || !r.content) return null;
        return { text: b64decode(r.content), sha: r.sha };
      })
      .catch(function (err) {
        if (err.status === 404) return null;
        throw err;
      });
  };

  GH.prototype.putFile = function (owner, repo, path, text, message, branch, sha) {
    var self = this;
    function write(existingSha) {
      var body = {
        message: message,
        content: b64encode(text),
        branch: branch
      };
      if (existingSha) body.sha = existingSha;
      return self.request("/repos/" + owner + "/" + repo + "/contents/" + path, {
        method: "PUT",
        body: body
      });
    }
    if (sha) return write(sha);
    return this.getFile(owner, repo, path, branch).then(function (f) {
      return write(f && f.sha);
    });
  };

  window.ANTIGONE.GH = GH;
  window.ANTIGONE.b64 = { encode: b64encode, decode: b64decode };
})();
