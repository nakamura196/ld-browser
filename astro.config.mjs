// Static pages only: everything the tool does (fetching RDF, tables, graphs) runs in the browser.
// The scripts in public/app/ are served unchanged (they import n3 / jsonld from jsDelivr at pinned versions).
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://nakamura196.github.io",
  // Provisional: the GitHub repository is not made yet (v2 in docs/notes/ld-browser.md).
  base: "/ld-browser",
  trailingSlash: "ignore",
  build: { inlineStylesheets: "never" },
  devToolbar: { enabled: false },
});
