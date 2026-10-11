#!/usr/bin/env zsh
# Builds the site locally and publishes it to the gh-pages branch, which GitHub Pages serves
# (Settings → Pages → Deploy from a branch: gh-pages, /). Publishing from a branch uses no Actions minutes.
#
# Prerequisites: run from the main checkout with main up to date; npm ci done.
# Usage: zsh scripts/deploy-pages.zsh
# What it does: npm run build, adds .nojekyll (so _astro/ is served), and force-pushes dist/
# as one commit to origin/gh-pages. The branch keeps no history: it is a build output.
set -euo pipefail

root=${0:A:h:h}
cd "$root"
branch=$(git rev-parse --abbrev-ref HEAD)
if [[ $branch != main ]]; then print -u2 "deploy-pages: run on main (now on $branch)"; exit 1; fi
rev=$(git rev-parse --short HEAD)
remote=$(git remote get-url origin)

npm run build
touch dist/.nojekyll

tmp=$(mktemp -d)
cp -R dist/. "$tmp"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$root" config user.name)" -c user.email="$(git -C "$root" config user.email)" commit -q -m "Build of main $rev"
git push -q --force "$remote" gh-pages
cd "$root"
rm -rf "$tmp"
print "deploy-pages: pushed the build of $rev to gh-pages ($(du -sh dist | cut -f1))"
