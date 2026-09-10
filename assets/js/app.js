/* ANTIGONE — page rendering: consortium grid, collection lists, editor forms. */

(function () {
  "use strict";

  var A = window.ANTIGONE;
  var ui = A.ui;
  var esc = ui.esc, safeUrl = ui.safeUrl, h = ui.h;

  /* --- what each collection holds --------------------------------------- */

  var SCHEMAS = {
    projects: {
      one: "project", many: "Projects",
      empty: "Work packages, case studies and sub-projects will be listed here as they start.",
      fields: [
        { name: "title", label: "Project name", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "url", label: "Link", type: "url" },
        { name: "lead", label: "Lead partner or person" },
        { name: "date", label: "Date", type: "date" }
      ]
    },
    tools: {
      one: "research tool", many: "Research tools",
      empty: "Software, instruments and methods developed by the consortium will be listed here as they are released.",
      fields: [
        { name: "title", label: "Tool name", required: true },
        { name: "description", label: "What it does", type: "textarea", required: true },
        { name: "kind", label: "Type", placeholder: "e.g. OSINT, annotation, classifier, red teaming" },
        { name: "url", label: "Link", type: "url" },
        { name: "repo", label: "Source code repository", type: "url" },
        { name: "lead", label: "Maintainer or lead partner" },
        { name: "access", label: "Availability", placeholder: "e.g. open source, consortium only, on request" },
        { name: "date", label: "Date", type: "date" }
      ]
    },
    publications: {
      one: "publication", many: "Publications",
      empty: "Articles, chapters, reports and deliverables will appear here once published.",
      fields: [
        { name: "title", label: "Publication title", required: true },
        { name: "authors", label: "Authors" },
        { name: "venue", label: "Journal, publisher or series" },
        { name: "description", label: "Abstract or note", type: "textarea" },
        { name: "url", label: "Link or DOI", type: "url" },
        { name: "date", label: "Publication date", type: "date" }
      ]
    },
    media: {
      one: "media appearance", many: "Media",
      empty: "Press coverage, interviews, podcasts and public talks will be collected here.",
      fields: [
        { name: "title", label: "Title of the appearance", required: true },
        { name: "outlet", label: "Outlet or venue" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "url", label: "Link", type: "url" },
        { name: "date", label: "Date", type: "date" }
      ]
    },
    datasets: {
      one: "dataset", many: "Datasets",
      empty: "Datasets produced or curated by the consortium will be listed here.",
      fields: [
        { name: "title", label: "Dataset name", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "url", label: "Link to the dataset", type: "url", required: true },
        { name: "access", label: "Access conditions", placeholder: "e.g. consortium only, on request, open" },
        { name: "date", label: "Date", type: "date" }
      ]
    },
    people: {
      one: "person", many: "People",
      empty: "Researchers and staff across the ten partner organisations will be listed here.",
      titleKey: "name",
      fields: [
        { name: "name", label: "Full name", required: true },
        { name: "role", label: "Role in ANTIGONE" },
        { name: "org", label: "Organisation" },
        { name: "description", label: "Short biography", type: "textarea" },
        { name: "url", label: "Profile link", type: "url" },
        { name: "photo", label: "Photo URL", type: "url" }
      ]
    }
  };

  function titleOf(schema, item) { return item[schema.titleKey || "title"] || "Untitled"; }

  /* --- consortium ------------------------------------------------------- */

  function registerRow(org) {
    var url = safeUrl(org.url);
    var inner =
      '<span class="register__name">' + esc(org.name) + "</span>" +
      '<span class="register__place">' + esc(org.country) + "</span>" +
      '<span class="register__host">' + esc(ui.hostOf(url) || "") + "</span>";

    return (
      "<li>" +
      (url
        ? '<a class="register__link" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + "</a>"
        : '<div class="register__link">' + inner + "</div>") +
      (org.note ? '<p class="register__note">' + esc(org.note) + "</p>" : "") +
      "</li>"
    );
  }

  function mountConsortium(mount) {
    A.store.consortium().then(function (data) {
      var items = data.items || [];
      var lead = items.filter(function (o) { return o.role === "Coordinator"; })[0];
      var rest = items.filter(function (o) { return o !== lead; });

      var html = "";

      if (lead) {
        var leadUrl = safeUrl(lead.url);
        html +=
          '<div class="consortium__lead">' +
          '  <p class="eyebrow">Coordinator</p>' +
          "  <h2>" +
          (leadUrl
            ? '<a href="' + esc(leadUrl) + '" target="_blank" rel="noopener">' + esc(lead.name) + "</a>"
            : esc(lead.name)) +
          "  </h2>" +
          '  <p class="consortium__legal">' + esc(lead.legalName || "") + "</p>" +
          '  <p class="consortium__meta">' + esc(lead.country) +
          (ui.hostOf(leadUrl) ? ' <span aria-hidden="true">&middot;</span> ' + esc(ui.hostOf(leadUrl)) : "") +
          "</p>" +
          "</div>";
      }

      if (rest.length) {
        html +=
          '<p class="eyebrow">Partners</p>' +
          '<ul class="register">' + rest.map(registerRow).join("") + "</ul>";
      }

      mount.innerHTML = html;
    });
  }

  /* --- collection rendering ---------------------------------------------- */

  function entryHtml(name, schema, item, canEdit) {
    var url = safeUrl(item.url);
    var title = titleOf(schema, item);
    var meta = [];
    if (item.authors) meta.push(esc(item.authors));
    if (item.kind) meta.push(esc(item.kind));
    if (item.venue) meta.push(esc(item.venue));
    if (item.outlet) meta.push(esc(item.outlet));
    if (item.lead) meta.push(esc(item.lead));
    if (item.access) meta.push("Access: " + esc(item.access));
    if (item.date) meta.push(ui.fmtDate(item.date));
    if (url) meta.push('<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(ui.hostOf(url)) + "</a>");
    var repo = safeUrl(item.repo);
    if (repo) meta.push('<a href="' + esc(repo) + '" target="_blank" rel="noopener">Source code</a>');

    var badge = item.visibility === "private"
      ? '<span class="badge badge--private">Private</span>'
      : '<span class="badge badge--public">Public</span>';

    return (
      '<li class="entry" data-id="' + esc(item.id) + '" data-visibility="' + esc(item.visibility) + '">' +
      '  <div class="entry__head">' +
      '    <h3 class="entry__title">' +
      (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(title) + "</a>" : esc(title)) +
      '    </h3>' + (canEdit || item.visibility === "private" ? badge : "") +
      '  </div>' +
      (item.description ? '<p class="entry__desc">' + esc(item.description) + "</p>" : "") +
      (meta.length ? '<div class="entry__foot">' + meta.join(' <span aria-hidden="true">·</span> ') + "</div>" : "") +
      (canEdit
        ? '<div class="form-actions">' +
          '<button class="btn btn--ghost btn--small" type="button" data-act="edit">Edit</button>' +
          '<button class="btn btn--ghost btn--small" type="button" data-act="toggle">' +
          (item.visibility === "private" ? "Make public" : "Make private") + "</button>" +
          '<button class="btn btn--danger btn--small" type="button" data-act="delete">Delete</button>' +
          "</div>"
        : "") +
      "</li>"
    );
  }

  function personHtml(item, canEdit) {
    var url = safeUrl(item.url);
    var name = esc(item.name || "Unnamed");
    return (
      '<li class="person" data-id="' + esc(item.id) + '" data-visibility="' + esc(item.visibility) + '">' +
      (item.photo ? '<img class="person__photo" src="' + esc(safeUrl(item.photo)) + '" alt="' + name + '" loading="lazy">'
                  : '<div class="person__photo"></div>') +
      '  <div class="person__name">' + (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + name + "</a>" : name) + "</div>" +
      (item.role ? '<div class="person__role">' + esc(item.role) + "</div>" : "") +
      (item.org ? '<div class="person__org">' + esc(item.org) + "</div>" : "") +
      (item.visibility === "private" ? ' <span class="badge badge--private">Private</span>' : "") +
      (canEdit
        ? '<div class="form-actions" style="margin-top:.6rem">' +
          '<button class="btn btn--ghost btn--small" type="button" data-act="edit">Edit</button>' +
          '<button class="btn btn--ghost btn--small" type="button" data-act="toggle">' +
          (item.visibility === "private" ? "Make public" : "Make private") + "</button>" +
          '<button class="btn btn--danger btn--small" type="button" data-act="delete">Delete</button>' +
          "</div>"
        : "") +
      "</li>"
    );
  }

  function emptyHtml(schema, signedIn) {
    return (
      '<div class="upcoming">' +
      '  <div class="upcoming__label">Upcoming</div>' +
      "  <p>" + esc(schema.empty) + "</p>" +
      (signedIn ? "" :
        '  <p style="margin-top:.75rem;font-size:.9rem">Consortium members can sign in to see and add material before it is published.</p>' +
        '  <button class="btn btn--ghost" type="button" data-signin-trigger="signin">Log in</button>') +
      "</div>"
    );
  }

  /* --- editor form ------------------------------------------------------- */

  function fieldHtml(f, value) {
    var v = esc(value == null ? "" : value);
    var label = "<span>" + esc(f.label) + (f.required ? " *" : "") + "</span>";
    if (f.type === "textarea") {
      return '<label class="field">' + label + '<textarea name="' + esc(f.name) + '"' +
        (f.required ? " required" : "") + ">" + v + "</textarea></label>";
    }
    var type = f.type === "date" ? "date" : f.type === "url" ? "url" : "text";
    return '<label class="field">' + label + '<input type="' + type + '" name="' + esc(f.name) + '" value="' + v + '"' +
      (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
      (f.required ? " required" : "") + "></label>";
  }

  function openForm(name, schema, item, onDone) {
    var isNew = !item;
    var data = item || {};
    var canPublish = A.auth.canPublish();

    var dlg = h(
      '<dialog class="modal" aria-label="' + esc(isNew ? "Add " + schema.one : "Edit " + schema.one) + '">' +
      '  <div class="modal__inner" style="position:relative">' +
      '    <button class="modal__close" type="button" aria-label="Close">&times;</button>' +
      '    <p class="eyebrow">' + esc(schema.many) + "</p>" +
      '    <h2 class="modal__title">' + esc(isNew ? "Add a " + schema.one : "Edit " + schema.one) + "</h2>" +
      '    <div class="notice notice--error" data-error hidden></div>' +
      "    <form novalidate>" +
      schema.fields.map(function (f) { return fieldHtml(f, data[f.name]); }).join("") +
      '      <label class="checkline">' +
      '        <input type="checkbox" name="isPublic"' +
      ((data.visibility === "public") ? " checked" : "") + (canPublish ? "" : " disabled") + ">" +
      "        <span>Visible on the public site" +
      (canPublish ? "" : " — you do not have write access to the public repository") + "</span>" +
      "      </label>" +
      '      <div class="form-actions">' +
      '        <button class="btn" type="submit">' + (isNew ? "Add" : "Save") + "</button>" +
      '        <button class="btn btn--ghost" type="button" data-cancel>Cancel</button>' +
      "      </div>" +
      "    </form>" +
      '    <p class="panel__hint" style="margin-top:1.25rem;font-size:.8rem">Saving commits to GitHub as ' +
      esc(A.auth.user ? A.auth.user.login : "you") + '. Public changes appear on the site once Pages rebuilds, usually under a minute.</p>' +
      "  </div>" +
      "</dialog>"
    );

    document.body.appendChild(dlg);
    var form = dlg.querySelector("form");
    var errBox = dlg.querySelector("[data-error]");

    function close() { dlg.close(); dlg.remove(); }
    dlg.querySelectorAll("[data-cancel], .modal__close").forEach(function (b) {
      b.addEventListener("click", close);
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var record = { id: data.id };
      var missing = null;
      schema.fields.forEach(function (f) {
        var val = (form.elements[f.name].value || "").trim();
        if (f.required && !val && !missing) missing = f.label;
        record[f.name] = val;
      });
      if (missing) {
        errBox.hidden = false;
        errBox.textContent = missing + " is required.";
        return;
      }

      var nextVis = form.elements.isPublic.checked ? "public" : "private";
      var submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Saving…";
      errBox.hidden = true;

      var work;
      if (isNew || !data.visibility || data.visibility === nextVis) {
        work = A.store.save(name, record, nextVis);
      } else {
        /* Field edits and a visibility change at once: write, then move. */
        record.visibility = data.visibility;
        work = A.store.save(name, record, data.visibility).then(function (saved) {
          saved.visibility = data.visibility;
          return A.store.setVisibility(name, saved, nextVis);
        });
      }

      work.then(function () {
        close();
        ui.flash("Saved to GitHub.", "ok");
        onDone();
      }).catch(function (err) {
        errBox.hidden = false;
        errBox.textContent = err.message || "Could not save.";
        submit.disabled = false;
        submit.textContent = isNew ? "Add" : "Save";
      });
    });

    dlg.showModal();
    var first = form.querySelector("input, textarea");
    if (first) first.focus();
  }

  /* --- collection mount --------------------------------------------------- */

  function mountCollection(mount) {
    var name = mount.dataset.collection;
    var schema = SCHEMAS[name];
    if (!schema) return;

    function render() {
      var canEdit = A.auth.canEdit();
      mount.setAttribute("aria-busy", "true");

      A.store.load(name, { force: true }).then(function (items) {
        mount.setAttribute("aria-busy", "false");
        var parts = [];

        if (canEdit) {
          parts.push(
            '<div class="form-actions" style="margin-bottom:1.5rem">' +
            '<button class="btn" type="button" data-add>Add a ' + esc(schema.one) + "</button>" +
            "</div>"
          );
        }

        if (!items.length) {
          parts.push(emptyHtml(schema, A.auth.isSignedIn()));
        } else if (name === "people") {
          parts.push('<ul class="people-grid">' + items.map(function (i) { return personHtml(i, canEdit); }).join("") + "</ul>");
        } else {
          parts.push('<ul class="entry-list">' + items.map(function (i) { return entryHtml(name, schema, i, canEdit); }).join("") + "</ul>");
        }

        mount.innerHTML = parts.join("");

        var add = mount.querySelector("[data-add]");
        if (add) add.addEventListener("click", function () { openForm(name, schema, null, render); });

        mount.querySelectorAll("[data-signin-trigger]").forEach(function (b) {
          b.addEventListener("click", function () { ui.openSignIn("signin"); });
        });

        mount.querySelectorAll("[data-act]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var li = btn.closest("[data-id]");
            var item = items.find(function (x) { return x.id === li.dataset.id; });
            if (!item) return;
            var act = btn.dataset.act;

            if (act === "edit") return openForm(name, schema, item, render);

            if (act === "toggle") {
              var next = item.visibility === "private" ? "public" : "private";
              if (next === "public" && !window.confirm(
                "Publish “" + titleOf(schema, item) + "” to the public site?")) return;
              btn.disabled = true;
              return A.store.setVisibility(name, item, next).then(function () {
                ui.flash(next === "public" ? "Published." : "Moved to the private store.", "ok");
                render();
              }).catch(function (err) {
                ui.flash(err.message, "error");
                btn.disabled = false;
              });
            }

            if (act === "delete") {
              if (!window.confirm("Delete “" + titleOf(schema, item) + "” permanently? This cannot be undone from the site.")) return;
              btn.disabled = true;
              return A.store.remove(name, item).then(function () {
                ui.flash("Deleted.", "ok");
                render();
              }).catch(function (err) {
                ui.flash(err.message, "error");
                btn.disabled = false;
              });
            }
          });
        });
      }).catch(function (err) {
        mount.setAttribute("aria-busy", "false");
        mount.innerHTML = '<div class="notice notice--error">' + esc(err.message || "Could not load this list.") + "</div>";
      });
    }

    A.auth.onChange(render);
  }

  /* --- private gate ------------------------------------------------------- */

  function mountGate(gate) {
    A.auth.onChange(function (state) {
      gate.hidden = state.role !== "none";
      var target = document.querySelector("[data-gated]");
      if (target) target.hidden = state.role === "none";
    });
  }

  /* --- boot --------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-consortium]").forEach(mountConsortium);
    document.querySelectorAll("[data-collection]").forEach(mountCollection);
    document.querySelectorAll("[data-gate]").forEach(mountGate);
    ui.init();
  });

  A.app = { schemas: SCHEMAS };
})();
