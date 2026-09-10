#!/usr/bin/env zsh
# Assembles the static pages from .build/head.tpl + .build/body-<slug>.html + .build/foot.tpl
set -e
cd "${0:A:h}/.."

build_page() {
  local slug="$1" out="$2" title="$3" desc="$4" cur="$5"
  local tmp head
  head=$(cat .build/head.tpl)

  # active nav marker
  for k in HOME CONS PEOP PROJ TOOL PUBS MEDI DATA; do
    if [[ "$k" == "$cur" ]]; then
      head=${head//__CUR_${k}__/ aria-current=\"page\"}
    else
      head=${head//__CUR_${k}__/}
    fi
  done
  head=${head//__TITLE__/$title}
  head=${head//__DESC__/$desc}

  { print -r -- "$head"; cat ".build/body-$slug.html"; cat .build/foot.tpl; } > "$out"
  print "  wrote $out"
}

build_page index        index.html        "ANTIGONE — from ANTagonIsm to aGOnism iN digital Ecosystems" "A Horizon Europe project on freedom of expression, disinformation and the institutional and technological conditions of democratic disagreement." HOME
build_page consortium   consortium.html   "Consortium — ANTIGONE" "The ten organisations across six countries that make up the ANTIGONE consortium." CONS
build_page people       people.html       "People — ANTIGONE" "Researchers and staff working on ANTIGONE." PEOP
build_page projects     projects.html     "Projects — ANTIGONE" "Work packages, case studies and sub-projects within ANTIGONE." PROJ
build_page tools        tools.html        "Research tools — ANTIGONE" "Software, instruments and methods built or adapted by the ANTIGONE consortium." TOOL
build_page publications publications.html "Publications — ANTIGONE" "Articles, chapters, reports and deliverables from the ANTIGONE project." PUBS
build_page media        media.html        "Media — ANTIGONE" "Press coverage, interviews and public appearances." MEDI
build_page datasets     datasets.html     "Datasets — ANTIGONE" "Datasets produced and curated by the ANTIGONE consortium." DATA
build_page notfound     404.html          "Page not found — ANTIGONE" "That page does not exist." NONE
