// Static pages only: everything the tool does (fetching RDF, tables, graphs) runs in the browser.
// The scripts in public/app/ are served unchanged (they import n3 / jsonld from jsDelivr at pinned versions).
import { defineConfig } from "astro/config";

export default defineConfig({
  // Custom domain on GitHub Pages (public/CNAME); the site sits at the root.
  site: "https://browser.ldas.jp",
  base: "/",
  trailingSlash: "ignore",
  build: { inlineStylesheets: "never" },
  devToolbar: { enabled: false },
});
