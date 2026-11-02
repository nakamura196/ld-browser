// Page text for the Astro pages, in Japanese and English. Strings marked html are rendered with set:html.
export type Lang = "ja" | "en";

const kanzaki = "https://web.archive.org/web/20250401124432/http://www.kanzaki.com/works/2014/pub/ld-browser";

const ja = {
  htmlLang: "ja",
  otherLang: "English",
  siteLabel: "サイト",
  nav: { home: "ホーム", browse: "ブラウザ", usecases: "ユースケース", about: "このツールについて" },
  titles: { browse: "ブラウザ", usecases: "ユースケース", about: "このツールについて" },
  description: "Musubi（結び）は、URI を入れると、その Linked Data をブラウザだけで取りに行き、表とグラフにしてたどれる道具です。",
  theme: { toDark: "ダーク", toLight: "ライト", toDarkLabel: "ダークモードに切り替える", toLightLabel: "ライトモードに切り替える" },
  footer: {
    p1: "ふだんはブラウザが直接 RDF を取りに行きます。別サイトからの読み込み（CORS）を許可していない一部の相手だけ、中継のサーバを通します。",
    p2: `着想は神崎正英さんの <a class="ds-footer__link" href="${kanzaki}">LD Browser</a>（2014）によります。`,
    guideH: "サイト案内",
    relatedH: "関連サイト",
    related: [["Kasane", "IIIF の画像を重ねて見る", "https://kasane.ldas.jp/"], ["Awase", "TEI の翻刻を画像と並べて読む", "https://awase.ldas.jp/"]],
    made: "作成: 中村 覚",
    source: "ソースコード",
  },
  form: { placeholder: "https://… の URI を入れる", button: "見る", aria: "見たい URI" },
  home: {
    eyebrow: "Linked Data を、ブラウザだけで",
    h1: ["URI を入れると、", "データの", "つながり", "が", "見える。"],
    lead: "RDF をブラウザが直接取りに行き、表とグラフにします。リンクを押せば、Wikidata や語彙の定義へそのままたどれます。",
    try: "試す:",
    graphAria: "資源どうしのつながりを表すグラフの例",
    nodes: { main: "神奈川沖浪裏", a: "葛飾北斎", p: "東京国立博物館", t: "江戸時代", k: "絵画", i: "画像" },
    edges: { a: "作者", p: "提供", t: "時代", k: "種類", i: "画像", same: "同じ人" },
    features: [
      ["表で読む", "属性ごとに 1 行。空白ノードや同じ文書の中の資源は入れ子に、別の文書は ▸ でその場に開きます。名前は日本語を優先します。"],
      ["図で見る", "300 トリプルまでの表は、グラフ図にできます。ノードを動かし、押せばその資源へ。SVG で保存もできます。"],
      ["いろいろな形式", "Turtle・N-Triples・JSON-LD・RDF/XML に加え、HTML に埋め込まれた JSON-LD・microdata・RDFa も読みます。"],
    ],
    examplesH: "例から始める",
    examples: [
      { kind: "ジャパンサーチ", title: "神奈川沖浪裏（作品）", text: "東京国立博物館の浮世絵。画像が出て、作者・時代・所蔵館へたどれます。" },
      { kind: "ジャパンサーチ", title: "葛飾北斎（人物）", text: "人物の典拠。Wikidata・DBpedia・VIAF など、ほかの機関の同じ人へ渡れます。" },
      { kind: "Wikidata", title: "葛飾北斎", text: "Wikidata の項目。名前は日本語を優先して出します。" },
      { kind: "語彙", title: "skos:prefLabel", text: "SKOS の定義。RDF/XML しか返さない語彙も読みます。" },
      { kind: "HTML", title: "schema.org の about", text: "HTML の頁から、埋め込まれた JSON-LD や microdata を取り出します。" },
    ],
    videoH: "使い方の動画",
    video: { id: "XNXKw03V55w", title: "使い方（5 分。旧名 LD Browser のころの画面です）" },
    usecasesMore: "ユースケースをもっと見る",
    newsH: "お知らせ",
    news: [
      ["2026-11-02", "名前を Musubi（結び）に改め、musubi.ldas.jp に移りました。見た目を Kasane・Awase と揃え、ユースケースのページを足しました。"],
      ["2026-11-02", "RailClass の移転先（railclass.ldas.jp）と、DBpedia を読めるようにしました。"],
      ["2026-10-14", "社会実験事例データベース（sedb）の語彙を読み、属性名を日本語と英語で出すようにしました。"],
      ["2026-10-13", "社会実験事例データベース（sedb）の URI を読めるようにしました。事例と実験の名前が出ます。"],
      ["2026-10-11", "使い方の動画（日本語・英語）を公開しました。"],
      ["2026-10-11", "画像の値を小さな絵で見せるようにしました。"],
      ["2026-10-11", "browser.ldas.jp で公開しました。"],
    ],
    howH: "しくみ",
    how: [
      ["読み替える", "URI から、RDF を取れる場所を決めます（Wikidata は Turtle の版、http は https に）。"],
      ["取りに行く", "ブラウザが相手のサーバへ直接取りに行きます。許可の無い一部の相手だけ、中継を通します。"],
      ["表と図にする", "名前を集めて、表と図にします。リンクを押すと次の資源へ進みます。"],
    ],
    aside: "取得の大半はブラウザだけで済むので、使う人が増えても止まりにくい作りです。許可の無い相手のうち、中継の対象に入れていないものは読めません。",
    more: "くわしく",
  },
  usecases: {
    h1: "ユースケース",
    intro: "公開されている Linked Data を、Musubi で開いた例です。押すとその資源が開き、そこからリンクをたどれます。読めない相手の例も 1 つ入れてあります。",
    open: "Musubi で開く",
    site: "元のサイト",
  },
  about: {
    h1: "このツールについて",
    intro: "Musubi（結び）は、URI を入れると、その資源を説明する RDF をブラウザが直接取りに行き、表とグラフにする道具です。リンクを押すと、次の資源へたどれます。",
    sections: [
      { h: "ふだんはサーバを使わない", html: [
        "取得も表示も、ふだんは見ている人のブラウザの中で行います。使う人が増えても、どこかに負荷が集まりません。",
        "ブラウザが直接読めるのは、別サイトからの読み込み（CORS）を許可している相手だけです。転送（301・303）の途中に許可の無い段があるときも読めません。",
        "許可の無い相手のうち、国立国会図書館の典拠など一部に限って、中継のサーバ（Vercel）を通して取りに行きます。直接読めなかったときだけ使い、画面に「中継を通して取得しました」と出ます。中継の対象に入っていない相手は「読み込めませんでした」と出ます。",
      ] },
      { h: "読める形式", list: [
        "Turtle、N-Triples、N-Quads、TriG、JSON-LD、RDF/XML",
        "HTML の頁に埋め込まれた JSON-LD（<code>&lt;script type=\"application/ld+json\"&gt;</code>）、microdata、RDFa",
      ], html: ["2 MB を超える文書は読みません。"] },
      { h: "読み替え", html: [
        "Wikidata の URI は、軽い Turtle の版（<code>Special:EntityData/…​.ttl?flavor=simple</code>）を取りに行きます。<code>http://</code> の URI は <code>https://</code> に替えます。SKOS や Dublin Core のように転送の途中で許可が切れる語彙は、転送の終点を直接取りに行きます。",
      ] },
      { h: "名前", html: [
        "Musubi（結び）は、データとデータを結ぶ道具、という意味で付けました。2026 年 11 月までは LD Browser という名前で、browser.ldas.jp で公開していました。IIIF の画像を扱う <a href=\"https://kasane.ldas.jp/\">Kasane</a>、TEI の翻刻を扱う <a href=\"https://awase.ldas.jp/\">Awase</a> と同じ見た目にそろえています。",
      ] },
      { h: "着想", html: [
        `神崎正英さんの <a href="${kanzaki}">LD Browser</a>（2014）に学びました。神崎さんの版はサーバで取得する作りで、2026 年 10 月現在、アクセス過多のため止まっています。`,
      ] },
    ],
  },
};

const en: typeof ja = {
  htmlLang: "en",
  otherLang: "日本語",
  siteLabel: "Site",
  nav: { home: "Home", browse: "Browser", usecases: "Use cases", about: "About" },
  titles: { browse: "Browser", usecases: "Use cases", about: "About" },
  description: "Musubi: enter a URI and it fetches its Linked Data directly in your browser, then shows it as a table and a graph you can follow.",
  theme: { toDark: "Dark", toLight: "Light", toDarkLabel: "Switch to dark mode", toLightLabel: "Switch to light mode" },
  footer: {
    p1: "Your browser normally fetches the RDF directly. Only a few sources that do not allow cross-origin requests (CORS) go through a relay server.",
    p2: `Inspired by <a class="ds-footer__link" href="${kanzaki}">LD Browser</a> (2014) by Masahide Kanzaki.`,
    guideH: "Site guide",
    relatedH: "Related sites",
    related: [["Kasane", "Overlay and compare IIIF images", "https://kasane.ldas.jp/en"], ["Awase", "Read TEI transcriptions beside the images", "https://awase.ldas.jp/en"]],
    made: "Made by Satoru Nakamura",
    source: "Source code",
  },
  form: { placeholder: "Enter a URI starting with https://…", button: "Go", aria: "URI to view" },
  home: {
    eyebrow: "Linked Data, in the browser alone",
    h1: ["Enter a URI,", "and see how the data", "connects", " ", "."],
    lead: "Your browser fetches the RDF directly and shows it as a table and a graph. Follow links straight to Wikidata or vocabulary definitions.",
    try: "Try:",
    graphAria: "Example graph showing how resources are connected",
    nodes: { main: "The Great Wave", a: "Hokusai", p: "Tokyo National Museum", t: "Edo period", k: "Painting", i: "Image" },
    edges: { a: "creator", p: "provider", t: "period", k: "type", i: "image", same: "sameAs" },
    features: [
      ["Read as a table", "One row per property. Blank nodes and resources in the same document are nested; other documents open in place with ▸. Names prefer English."],
      ["See as a graph", "Tables of up to 300 triples can be drawn as a graph. Drag nodes, click one to open that resource, or save as SVG."],
      ["Many formats", "Turtle, N-Triples, JSON-LD and RDF/XML, plus JSON-LD, microdata and RDFa embedded in HTML."],
    ],
    examplesH: "Start from an example",
    examples: [
      { kind: "Japan Search", title: "The Great Wave (work)", text: "A ukiyo-e print at the Tokyo National Museum. Shows the image and leads to its artist, period and holder." },
      { kind: "Japan Search", title: "Katsushika Hokusai (person)", text: "A name authority. Jump to the same person at Wikidata, DBpedia, VIAF and others." },
      { kind: "Wikidata", title: "Katsushika Hokusai", text: "A Wikidata item. Names are shown in English first." },
      { kind: "Vocabulary", title: "skos:prefLabel", text: "A SKOS definition. Vocabularies that only return RDF/XML are read too." },
      { kind: "HTML", title: "schema.org about", text: "Extracts the JSON-LD or microdata embedded in an HTML page." },
    ],
    videoH: "Watch how it works",
    video: { id: "gIjU2KkaxAE", title: "Usage video (4 min, recorded under the former name LD Browser)" },
    usecasesMore: "More use cases",
    newsH: "News",
    news: [
      ["2026-11-02", "Renamed Musubi and moved to musubi.ldas.jp. The look now matches Kasane and Awase, and a use-case page was added."],
      ["2026-11-02", "Reads RailClass at its new address (railclass.ldas.jp) and DBpedia."],
      ["2026-10-14", "Reads the vocabulary of the social-experiment case database (sedb), so its property names show in Japanese and English."],
      ["2026-10-13", "Reads the social-experiment case database (sedb) URIs and shows case and experiment names."],
      ["2026-10-11", "Usage videos published (Japanese and English)."],
      ["2026-10-11", "Image values are shown as small pictures."],
      ["2026-10-11", "Published at browser.ldas.jp."],
    ],
    howH: "How it works",
    how: [
      ["Rewrite", "Decide where the RDF can be fetched from the URI (a Turtle version for Wikidata, https for http)."],
      ["Fetch", "Your browser requests it directly from the other server. A few sources without permission go through a relay."],
      ["Show", "Collect names and render a table and a graph. Click a link to move to the next resource."],
    ],
    aside: "Most fetching needs nothing but the browser, so it holds up as more people use it. Sources without permission that the relay does not cover cannot be read.",
    more: "Details",
  },
  usecases: {
    h1: "Use cases",
    intro: "Published Linked Data opened in Musubi. Click one to open that resource and follow its links from there. One example shows a source that cannot be read.",
    open: "Open in Musubi",
    site: "Source site",
  },
  about: {
    h1: "About this tool",
    intro: "Musubi takes a URI, fetches the RDF describing that resource directly from your browser, and shows it as a table and a graph. Click a link to follow it to the next resource.",
    sections: [
      { h: "Normally no server", html: [
        "Fetching and display normally happen in the browser of whoever is looking, so load does not concentrate anywhere as more people use it.",
        "A browser can only read sites that allow cross-origin requests (CORS). The same applies if one step of a redirect (301, 303) lacks the permission.",
        "For a few sources without the permission, such as the National Diet Library authorities, Musubi goes through a relay server (Vercel). It is used only after a direct fetch fails, and the page says so. Other sources without the permission show \"Could not load\".",
      ] },
      { h: "Supported formats", list: [
        "Turtle, N-Triples, N-Quads, TriG, JSON-LD, RDF/XML",
        "JSON-LD (<code>&lt;script type=\"application/ld+json\"&gt;</code>), microdata and RDFa embedded in HTML pages",
      ], html: ["Documents over 2 MB are not read."] },
      { h: "Rewriting", html: [
        "For Wikidata URIs, the light Turtle version (<code>Special:EntityData/…​.ttl?flavor=simple</code>) is fetched. <code>http://</code> URIs become <code>https://</code>. For vocabularies such as SKOS and Dublin Core, where a redirect step loses the permission, the final target of the redirect is fetched directly.",
      ] },
      { h: "The name", html: [
        "Musubi (結び, \"tying together\") is a tool for following the ties between data. Until November 2026 it was called LD Browser and lived at browser.ldas.jp. It shares its look with <a href=\"https://kasane.ldas.jp/en\">Kasane</a> for IIIF images and <a href=\"https://awase.ldas.jp/en\">Awase</a> for TEI transcriptions.",
      ] },
      { h: "Inspiration", html: [
        `Learned from <a href="${kanzaki}">LD Browser</a> (2014) by Masahide Kanzaki. His version fetches through a server and, as of October 2026, is down because of heavy traffic.`,
      ] },
    ],
  },
};

export const dict = { ja, en };

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
// Site root for a language: "/" or "/en/".
export const root = (lang: Lang) => (lang === "en" ? `${base}en/` : base);
