// Page text for the Astro pages, in Japanese and English. Strings marked html are rendered with set:html.
export type Lang = "ja" | "en";

const kanzaki = "https://web.archive.org/web/20250401124432/http://www.kanzaki.com/works/2014/pub/ld-browser";

const ja = {
  htmlLang: "ja",
  otherLang: "English",
  siteLabel: "サイト",
  nav: { home: "ホーム", browse: "ブラウザ", about: "このツールについて" },
  titles: { browse: "ブラウザ", about: "このツールについて" },
  description: "URI を入れると、その Linked Data をブラウザだけで取りに行き、表とグラフにしてたどれます。",
  theme: { toDark: "ダーク", toLight: "ライト", toDarkLabel: "ダークモードに切り替える", toLightLabel: "ライトモードに切り替える" },
  footer: {
    p1: "サーバを持たず、ブラウザが直接 RDF を取りに行きます。読めるのは、別サイトからの読み込み（CORS）を許可している相手だけです。",
    p2: `着想は神崎正英さんの <a href="${kanzaki}">LD Browser</a>（2014）によります。別に作ったもので、神崎さんの道具ではありません。`,
    made: "作成: 中村 覚 ・ ",
    source: "ソースコード",
  },
  form: { placeholder: "https://… の URI を入れる", button: "見る", aria: "見たい URI" },
  home: {
    eyebrow: "Linked Data を、ブラウザだけで",
    h1: ["URI を入れると、", "データの", "つながり", "が", "見える。"],
    lead: "RDF をブラウザが直接取りに行き、表とグラフにします。リンクを押せば、Wikidata や語彙の定義へそのままたどれます。サーバは使いません。",
    try: "試す:",
    graphAria: "資源どうしのつながりを表すグラフの例",
    nodes: { op: "ドイツ鉄道", m: "3D モデル", g: "標準軌", l: "路線", co: "赤" },
    edges: { op: "運営者", g: "軌間", l: "路線での運用", m: "形式", co: "塗装", w: "説明" },
    features: [
      ["表で読む", "属性ごとに 1 行。空白ノードや同じ文書の中の資源は入れ子に、別の文書は ▸ でその場に開きます。名前は日本語を優先します。"],
      ["図で見る", "300 トリプルまでの表は、グラフ図にできます。ノードを動かし、押せばその資源へ。SVG で保存もできます。"],
      ["いろいろな形式", "Turtle・N-Triples・JSON-LD・RDF/XML に加え、HTML に埋め込まれた JSON-LD・microdata・RDFa も読みます。"],
    ],
    examplesH: "例から始める",
    examples: [
      { kind: "RailClass", title: "ICE T（形式）", text: "鉄道車両の形式。運営者や路線が Wikidata の名前で日本語になります。" },
      { kind: "RailClass", title: "ICE T 411（3D モデル）", text: "模型の 3D データ。形式を自動で開き、塗装の色までたどれます。" },
      { kind: "Wikidata", title: "ICE T", text: "Wikidata の項目。RailClass に同じ形式があれば、そこへ戻れます。" },
      { kind: "語彙", title: "skos:prefLabel", text: "SKOS の定義。RDF/XML しか返さない語彙も読みます。" },
      { kind: "HTML", title: "schema.org の about", text: "HTML の頁から、埋め込まれた JSON-LD や microdata を取り出します。" },
    ],
    howH: "しくみ",
    how: [
      ["読み替える", "URI から、RDF を取れる場所を決めます（Wikidata は Turtle の版、http は https に）。"],
      ["取りに行く", "ブラウザが相手のサーバへ直接取りに行きます。中継のサーバは置きません。"],
      ["表と図にする", "名前を集めて、表と図にします。リンクを押すと次の資源へ進みます。"],
    ],
    aside: "中継のサーバを置かないので、使う人が増えても止まりません。そのかわり、別サイトからの読み込み（CORS）を許可していない相手は読めません。",
    more: "くわしく",
  },
  about: {
    h1: "このツールについて",
    intro: "LD Browser は、URI を入れると、その資源を説明する RDF をブラウザが直接取りに行き、表とグラフにする道具です。リンクを押すと、次の資源へたどれます。",
    sections: [
      { h: "サーバを持たない", html: [
        "取得も表示も、すべて見ている人のブラウザの中で行います。中継のサーバが無いので、使う人が増えてもどこかに負荷が集まりません。",
        "そのかわり、読めるのは別サイトからの読み込み（CORS）を許可している相手だけです。許可していない相手は「読み込めませんでした」と出ます。転送（301・303）の途中に許可の無い段があるときも、同じく読めません。",
      ] },
      { h: "読める形式", list: [
        "Turtle、N-Triples、N-Quads、TriG、JSON-LD、RDF/XML",
        "HTML の頁に埋め込まれた JSON-LD（<code>&lt;script type=\"application/ld+json\"&gt;</code>）、microdata、RDFa",
      ], html: ["2 MB を超える文書は読みません。"] },
      { h: "読み替え", html: [
        "Wikidata の URI は、軽い Turtle の版（<code>Special:EntityData/…​.ttl?flavor=simple</code>）を取りに行きます。<code>http://</code> の URI は <code>https://</code> に替えます。SKOS や Dublin Core のように転送の途中で許可が切れる語彙は、転送の終点を直接取りに行きます。",
      ] },
      { h: "着想", html: [
        `神崎正英さんの <a href="${kanzaki}">LD Browser</a>（2014）に学びました。神崎さんの版はサーバで取得する作りで、2026 年 10 月現在、アクセス過多のため止まっています。この道具はそれとは別に作ったもので、神崎さんの道具ではありません。`,
      ] },
    ],
  },
};

const en: typeof ja = {
  htmlLang: "en",
  otherLang: "日本語",
  siteLabel: "Site",
  nav: { home: "Home", browse: "Browser", about: "About" },
  titles: { browse: "Browser", about: "About" },
  description: "Enter a URI and this tool fetches its Linked Data directly in your browser, then shows it as a table and a graph you can follow.",
  theme: { toDark: "Dark", toLight: "Light", toDarkLabel: "Switch to dark mode", toLightLabel: "Switch to light mode" },
  footer: {
    p1: "There is no server: your browser fetches the RDF directly. It can only read sites that allow cross-origin requests (CORS).",
    p2: `Inspired by <a href="${kanzaki}">LD Browser</a> (2014) by Masahide Kanzaki. This is a separate implementation and is not Kanzaki's tool.`,
    made: "Made by Satoru Nakamura · ",
    source: "Source code",
  },
  form: { placeholder: "Enter a URI starting with https://…", button: "Go", aria: "URI to view" },
  home: {
    eyebrow: "Linked Data, in the browser alone",
    h1: ["Enter a URI,", "and see how the data", "connects", " ", "."],
    lead: "Your browser fetches the RDF directly and shows it as a table and a graph. Follow links straight to Wikidata or vocabulary definitions. No server involved.",
    try: "Try:",
    graphAria: "Example graph showing how resources are connected",
    nodes: { op: "Deutsche Bahn", m: "3D model", g: "Standard gauge", l: "Line", co: "Red" },
    edges: { op: "operator", g: "gauge", l: "used on line", m: "class", co: "livery", w: "description" },
    features: [
      ["Read as a table", "One row per property. Blank nodes and resources in the same document are nested; other documents open in place with ▸. Names prefer English."],
      ["See as a graph", "Tables of up to 300 triples can be drawn as a graph. Drag nodes, click one to open that resource, or save as SVG."],
      ["Many formats", "Turtle, N-Triples, JSON-LD and RDF/XML, plus JSON-LD, microdata and RDFa embedded in HTML."],
    ],
    examplesH: "Start from an example",
    examples: [
      { kind: "RailClass", title: "ICE T (class)", text: "A rail vehicle class. Operators and lines are named from Wikidata." },
      { kind: "RailClass", title: "ICE T 411 (3D model)", text: "A 3D model. Opens its class automatically and follows through to the livery colour." },
      { kind: "Wikidata", title: "ICE T", text: "A Wikidata item. If RailClass has the same class, you can jump back to it." },
      { kind: "Vocabulary", title: "skos:prefLabel", text: "A SKOS definition. Vocabularies that only return RDF/XML are read too." },
      { kind: "HTML", title: "schema.org about", text: "Extracts the JSON-LD or microdata embedded in an HTML page." },
    ],
    howH: "How it works",
    how: [
      ["Rewrite", "Decide where the RDF can be fetched from the URI (a Turtle version for Wikidata, https for http)."],
      ["Fetch", "Your browser requests it directly from the other server. There is no relay server."],
      ["Show", "Collect names and render a table and a graph. Click a link to move to the next resource."],
    ],
    aside: "With no relay server, it does not stop when more people use it. In return, sites that do not allow cross-origin requests (CORS) cannot be read.",
    more: "Details",
  },
  about: {
    h1: "About this tool",
    intro: "LD Browser takes a URI, fetches the RDF describing that resource directly from your browser, and shows it as a table and a graph. Click a link to follow it to the next resource.",
    sections: [
      { h: "No server", html: [
        "Fetching and display both happen in the browser of whoever is looking. With no relay server, load does not concentrate anywhere as more people use it.",
        "In return, it can only read sites that allow cross-origin requests (CORS). Others show \"Could not load\". The same happens if one step of a redirect (301, 303) lacks the permission.",
      ] },
      { h: "Supported formats", list: [
        "Turtle, N-Triples, N-Quads, TriG, JSON-LD, RDF/XML",
        "JSON-LD (<code>&lt;script type=\"application/ld+json\"&gt;</code>), microdata and RDFa embedded in HTML pages",
      ], html: ["Documents over 2 MB are not read."] },
      { h: "Rewriting", html: [
        "For Wikidata URIs, the light Turtle version (<code>Special:EntityData/…​.ttl?flavor=simple</code>) is fetched. <code>http://</code> URIs become <code>https://</code>. For vocabularies such as SKOS and Dublin Core, where a redirect step loses the permission, the final target of the redirect is fetched directly.",
      ] },
      { h: "Inspiration", html: [
        `Learned from <a href="${kanzaki}">LD Browser</a> (2014) by Masahide Kanzaki. His version fetches through a server and, as of October 2026, is down because of heavy traffic. This tool is a separate implementation and is not Kanzaki's tool.`,
      ] },
    ],
  },
};

export const dict = { ja, en };

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
// Site root for a language: "/ld-browser/" or "/ld-browser/en/".
export const root = (lang: Lang) => (lang === "en" ? `${base}en/` : base);
