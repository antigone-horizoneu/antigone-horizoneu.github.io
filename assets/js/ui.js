/* ANTIGONE — shared interface: sign-in, auth chip, mobile nav, inline editing. */

(function () {
  "use strict";

  var A = window.ANTIGONE;
  var cfg = A.config;

  /* --- tiny helpers ----------------------------------------------------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Allows only http(s) and mailto, so a stored link can never become script. */
  function safeUrl(url) {
    var s = String(url || "").trim();
    if (!s) return "";
    if (/^(https?:|mailto:)/i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return "https://" + s;
    return "";
  }

  function hostOf(url) {
    try { return new URL(safeUrl(url)).hostname.replace(/^www\./, ""); }
    catch (e) { return ""; }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }

  function h(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  var ui = { esc: esc, safeUrl: safeUrl, hostOf: hostOf, fmtDate: fmtDate, h: h };

  /* --- sign-in dialog ---------------------------------------------------- */

  var dialog = null;

  function buildDialog() {
    if (dialog) return dialog;

    dialog = h(
      '<dialog class="modal" aria-labelledby="signin-title">' +
      '  <div class="modal__inner" style="position:relative">' +
      '    <button class="modal__close" type="button" aria-label="Close">&times;</button>' +
      '    <p class="eyebrow">Members area</p>' +
      '    <h2 class="modal__title" id="signin-title">Sign in</h2>' +
      '    <div class="modal__tabs" role="tablist">' +
      '      <button class="modal__tab" role="tab" aria-selected="true" data-tab="signin">Sign in</button>' +
      '      <button class="modal__tab" role="tab" aria-selected="false" data-tab="request">Request access</button>' +
      '    </div>' +
      '    <div data-panel="signin">' +
      '      <p class="panel__hint">Access is granted through the <a href="https://github.com/' + esc(cfg.org) + '" target="_blank" rel="noopener">' + esc(cfg.org) + '</a> GitHub organisation. Sign in with a personal access token, which acts as your username and password for this site.</p>' +
      '      <ol class="steps">' +
      '        <li>Open <a href="' + esc(cfg.tokenDocsUrl) + '" target="_blank" rel="noopener">GitHub &rarr; fine-grained personal access tokens</a>.</li>' +
      '        <li>Set <strong>Resource owner</strong> to <code>' + esc(cfg.org) + '</code>.</li>' +
      '        <li>Under repository permissions grant <code>Contents: Read and write</code> and <code>Metadata: Read-only</code>.</li>' +
      '        <li>Generate the token and paste it below.</li>' +
      '      </ol>' +
      '      <div class="notice notice--error" data-error hidden></div>' +
      '      <form data-signin-form novalidate>' +
      '        <label class="field field--mono">' +
      '          <span>Personal access token</span>' +
      '          <input type="password" name="token" autocomplete="current-password" placeholder="github_pat_…" required>' +
      '        </label>' +
      '        <label class="checkline"><input type="checkbox" name="remember"> <span>Keep me signed in on this device</span></label>' +
      '        <div class="form-actions">' +
      '          <button class="btn" type="submit">Sign in</button>' +
      '          <button class="btn btn--ghost" type="button" data-cancel>Cancel</button>' +
      '        </div>' +
      '      </form>' +
      '      <p class="panel__hint" style="margin-top:1.25rem;font-size:.8rem">The token is stored only in this browser and sent only to api.github.com. Sign out clears it.</p>' +
      '    </div>' +
      '    <div data-panel="request" hidden>' +
      '      <p class="panel__hint">Not part of the consortium organisation yet? Open an access request. An ANTIGONE administrator reviews it and sends you a GitHub invitation to the organisation and the private repository.</p>' +
      '      <label class="field">' +
      '        <span>Your GitHub username</span>' +
      '        <input type="text" name="login" placeholder="octocat">' +
      '      </label>' +
      '      <div class="form-actions">' +
      '        <a class="btn" data-request-link href="#" target="_blank" rel="noopener">Open access request</a>' +
      '        <button class="btn btn--ghost" type="button" data-cancel>Cancel</button>' +
      '      </div>' +
      '      <p class="panel__hint" style="margin-top:1.25rem;font-size:.8rem">You choose your own GitHub username and password when you create the account. ANTIGONE never sees or stores either.</p>' +
      '    </div>' +
      '  </div>' +
      '</dialog>'
    );

    document.body.appendChild(dialog);

    var errBox = dialog.querySelector("[data-error]");
    var form = dialog.querySelector("[data-signin-form]");
    var loginInput = dialog.querySelector('input[name="login"]');
    var requestLink = dialog.querySelector("[data-request-link]");

    function syncRequestLink() {
      requestLink.href = A.auth.accessRequestUrl(loginInput.value.trim());
    }
    loginInput.addEventListener("input", syncRequestLink);
    syncRequestLink();

    dialog.querySelectorAll("[data-cancel], .modal__close").forEach(function (b) {
      b.addEventListener("click", function () { dialog.close(); });
    });

    dialog.querySelectorAll(".modal__tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var which = tab.dataset.tab;
        dialog.querySelectorAll(".modal__tab").forEach(function (t) {
          t.setAttribute("aria-selected", String(t === tab));
        });
        dialog.querySelectorAll("[data-panel]").forEach(function (p) {
          p.hidden = p.dataset.panel !== which;
        });
      });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var token = form.token.value.trim();
      var remember = form.remember.checked;
      if (!token) return;
      errBox.hidden = true;
      var submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Checking…";

      A.auth.signIn(token, remember).then(function () {
        form.reset();
        dialog.close();
        window.location.reload();
      }).catch(function (err) {
        errBox.hidden = false;
        errBox.textContent = err && err.status === 401
          ? "That token was not accepted by GitHub. Check that you copied it in full and that it has not expired."
          : (err.message || "Sign-in failed.");
        if (err && err.code === "NO_ACCESS") {
          loginInput.value = err.login || "";
          syncRequestLink();
        }
      }).then(function () {
        submit.disabled = false;
        submit.textContent = "Sign in";
      });
    });

    return dialog;
  }

  ui.openSignIn = function (tab) {
    var d = buildDialog();
    var target = tab || "signin";
    d.querySelectorAll(".modal__tab").forEach(function (t) {
      t.setAttribute("aria-selected", String(t.dataset.tab === target));
    });
    d.querySelectorAll("[data-panel]").forEach(function (p) { p.hidden = p.dataset.panel !== target; });
    d.showModal();
    var first = d.querySelector('[data-panel]:not([hidden]) input');
    if (first) first.focus();
  };

  /* --- auth chip --------------------------------------------------------- */

  function renderAuthSlot(state) {
    document.querySelectorAll("[data-auth-slot]").forEach(function (slot) {
      slot.innerHTML = "";
      if (state.role === "none") {
        var btn = h('<button class="btn btn--ghost btn--small" type="button">Log in</button>');
        btn.addEventListener("click", function () { ui.openSignIn("signin"); });
        slot.appendChild(btn);
        return;
      }
      var chip = h(
        '<div class="auth-chip">' +
        (state.user && state.user.avatar_url
          ? '<img class="auth-chip__avatar" src="' + esc(state.user.avatar_url) + '&s=52" alt="" width="26" height="26">'
          : "") +
        '<span class="auth-chip__name">' + esc(state.user ? (state.user.name || state.user.login) : "") + '</span>' +
        '<span class="auth-chip__role" data-role="' + esc(state.role) + '">' + esc(state.role) + '</span>' +
        '<button class="btn btn--ghost btn--small" type="button" data-signout>Sign out</button>' +
        '</div>'
      );
      chip.querySelector("[data-signout]").addEventListener("click", function () {
        A.auth.signOut();
        window.location.reload();
      });
      slot.appendChild(chip);
    });
  }

  /* --- inline editing of site copy --------------------------------------- */

  var toolbar = null;
  var editing = null;

  function ensureToolbar() {
    if (toolbar) return toolbar;
    toolbar = h(
      '<div class="edit-toolbar" hidden>' +
      '  <span data-label>Editing</span>' +
      '  <button class="btn btn--small" type="button" data-save>Save</button>' +
      '  <button class="btn btn--small" type="button" data-cancel>Cancel</button>' +
      '</div>'
    );
    document.body.appendChild(toolbar);
    toolbar.querySelector("[data-cancel]").addEventListener("click", stopEditing);
    toolbar.querySelector("[data-save]").addEventListener("click", saveEditing);
    return toolbar;
  }

  function startEditing(el) {
    if (editing) stopEditing();
    editing = { el: el, original: el.innerHTML };
    el.setAttribute("contenteditable", "true");
    el.classList.add("is-editing");
    el.focus();
    var tb = ensureToolbar();
    tb.querySelector("[data-label]").textContent = "Editing “" + el.dataset.editable + "”";
    tb.hidden = false;
  }

  function stopEditing() {
    if (!editing) return;
    editing.el.innerHTML = editing.original;
    editing.el.removeAttribute("contenteditable");
    editing.el.classList.remove("is-editing");
    editing = null;
    if (toolbar) toolbar.hidden = true;
  }

  function saveEditing() {
    if (!editing) return;
    var el = editing.el;
    var key = el.dataset.editable;
    var html = el.innerHTML.trim();
    var btn = toolbar.querySelector("[data-save]");
    btn.disabled = true;
    btn.textContent = "Saving…";

    A.store.saveBlock(key, html).then(function () {
      el.removeAttribute("contenteditable");
      el.classList.remove("is-editing");
      editing = null;
      toolbar.hidden = true;
      ui.flash("Saved. GitHub Pages usually republishes within a minute.", "ok");
    }).catch(function (err) {
      ui.flash(err.message || "Could not save.", "error");
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Save";
    });
  }

  function enableEditing() {
    document.querySelectorAll("[data-editable]").forEach(function (el) {
      el.classList.add("is-editable");
      el.addEventListener("click", function (ev) {
        if (editing) return;
        if (ev.target.closest("a")) return;
        startEditing(el);
      });
    });
  }

  function applyBlocks() {
    var nodes = document.querySelectorAll("[data-editable]");
    if (!nodes.length) return Promise.resolve();
    return A.store.fetchBlocks().then(function (blocks) {
      nodes.forEach(function (el) {
        var v = blocks[el.dataset.editable];
        if (typeof v === "string" && v.trim()) el.innerHTML = v;
      });
    });
  }

  /* --- flash messages ---------------------------------------------------- */

  ui.flash = function (message, kind) {
    var box = document.querySelector("[data-flash]");
    if (!box) {
      box = h('<div class="notice" data-flash style="position:fixed;left:50%;bottom:5rem;transform:translateX(-50%);z-index:70;max-width:min(90vw,34rem);box-shadow:0 10px 30px -14px rgba(0,0,0,.4)"></div>');
      document.body.appendChild(box);
    }
    box.className = "notice " + (kind === "error" ? "notice--error" : kind === "ok" ? "notice--ok" : "");
    box.textContent = message;
    box.hidden = false;
    clearTimeout(box._t);
    box._t = setTimeout(function () { box.hidden = true; }, 6000);
  };

  /* --- boot -------------------------------------------------------------- */

  ui.init = function () {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".site-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        toggle.setAttribute("aria-expanded", String(!open));
      });
    }

    document.querySelectorAll("[data-signin-trigger]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ui.openSignIn(b.dataset.signinTrigger || "signin");
      });
    });

    A.auth.onChange(function (state) {
      renderAuthSlot(state);
      document.querySelectorAll("[data-when-role]").forEach(function (el) {
        var allowed = el.dataset.whenRole.split(/\s+/);
        el.hidden = allowed.indexOf(state.role) === -1;
      });
      if (state.role === "editor" && A.auth.canPublish()) enableEditing();
    });

    applyBlocks();
    return A.auth.restore();
  };

  A.ui = ui;
})();
