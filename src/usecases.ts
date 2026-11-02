// Use cases: real, published Linked Data opened in Musubi. Listed on /usecases/ (newest first by `added`).
// The same shape as Awase (src/lib/usecases.ts) and Kasane: id, added, title, note, what it shows, where it comes from.
// To add one, append an entry; the page needs no change. Every URI here was checked to load on 2026-11-02.

type Localized = { ja: string; en: string };

/** What the example shows. Shown as tags; names below. */
export const FEATURES = {
  sameas: { ja: "機関をまたぐ", en: "Across institutions" },
  image: { ja: "画像", en: "Images" },
  graph: { ja: "グラフ", en: "Graph" },
  nested: { ja: "入れ子", en: "Nesting" },
  vocab: { ja: "語彙", en: "Vocabulary" },
  jsonld: { ja: "JSON-LD", en: "JSON-LD" },
  rdfxml: { ja: "RDF/XML", en: "RDF/XML" },
  html: { ja: "HTML 埋め込み", en: "Embedded in HTML" },
  rewrite: { ja: "読み替え", en: "Rewriting" },
  relay: { ja: "中継", en: "Relay" },
} satisfies Record<string, Localized>;
export type Feature = keyof typeof FEATURES;

export interface UseCase {
  // Anchor on the page (/usecases/#<id>): lowercase letters, digits, hyphens
  id: string;
  // Date added (YYYY-MM-DD)
  added: string;
  // Who publishes the data (shown as the card's small label)
  source: Localized;
  title: Localized;
  // 2–3 sentences: what the data is and what Musubi does with it
  note: Localized;
  // The URI to open
  uri: string;
  features: Feature[];
  // The publisher's own page about the data
  site?: string;
}

export const USE_CASES: UseCase[] = [
  {
    id: "jps-great-wave",
    added: "2026-11-02",
    source: { ja: "ジャパンサーチ", en: "Japan Search" },
    title: { ja: "浮世絵から、作者と各国の典拠へ", en: "From a ukiyo-e print to its artist, across national authorities" },
    note: {
      ja: "東京国立博物館の「冨嶽三十六景・神奈川沖浪裏」。画像が出て、作者・時代・所蔵館は入れ子で開きます。作者の葛飾北斎からは、Wikidata・DBpedia・VIAF・国立国会図書館の同じ人へ渡れます。",
      en: "The Great Wave off Kanagawa at the Tokyo National Museum. The image is shown, and the artist, period and holder open in place. From Hokusai you can jump to the same person at Wikidata, DBpedia, VIAF and the National Diet Library.",
    },
    uri: "https://jpsearch.go.jp/data/cobas-52087",
    features: ["image", "nested", "sameas", "graph"],
    site: "https://jpsearch.go.jp/item/cobas-52087",
  },
  {
    id: "jps-hokusai",
    added: "2026-11-02",
    source: { ja: "ジャパンサーチ", en: "Japan Search" },
    title: { ja: "1 人の人物を、機関をまたいで結ぶ", en: "One person, tied across institutions" },
    note: {
      ja: "ジャパンサーチの人物の典拠「葛飾北斎」。別名がかな・英語つきで並び、owl:sameAs で各国の典拠と結ばれています。グラフにすると、その結び目が一目で分かります。",
      en: "Japan Search's name authority for Katsushika Hokusai. Alternative names are listed with kana and English readings, and owl:sameAs ties him to authorities around the world. The graph shows those ties at a glance.",
    },
    uri: "https://jpsearch.go.jp/entity/chname/葛飾北斎",
    features: ["sameas", "graph"],
    site: "https://jpsearch.go.jp/",
  },
  {
    id: "dbpedia-hokusai",
    added: "2026-11-02",
    source: { ja: "DBpedia", en: "DBpedia" },
    title: { ja: "Wikipedia から作られた Linked Data", en: "Linked Data built from Wikipedia" },
    note: {
      ja: "DBpedia の「Hokusai」。DBpedia は https の URI を http の住所へ転送するため、そのままではブラウザから読めません。Musubi は転送先の Turtle を直接取りに行きます。",
      en: "DBpedia's Hokusai. DBpedia redirects its https URIs to an http address, which a browser page cannot follow; Musubi fetches the Turtle file directly instead.",
    },
    uri: "http://dbpedia.org/resource/Hokusai",
    features: ["rewrite", "sameas"],
    site: "https://dbpedia.org/page/Hokusai",
  },
  {
    id: "loc-hokusai",
    added: "2026-11-02",
    source: { ja: "米国議会図書館", en: "Library of Congress" },
    title: { ja: "米国議会図書館の名前典拠", en: "A Library of Congress name authority" },
    note: {
      ja: "米国議会図書館の典拠（id.loc.gov）の葛飾北斎。JSON-LD で返ってくる、入れ子の深いデータです。異表記や典拠の出典が、入れ子のまま読めます。",
      en: "Hokusai in the Library of Congress authorities (id.loc.gov). The data comes back as deeply nested JSON-LD; variant names and sources can be read in place.",
    },
    uri: "http://id.loc.gov/authorities/names/n80043599",
    features: ["jsonld", "nested"],
    site: "https://id.loc.gov/authorities/names/n80043599.html",
  },
  {
    id: "geonames-tokyo",
    added: "2026-11-02",
    source: { ja: "GeoNames", en: "GeoNames" },
    title: { ja: "地名の典拠と緯度経度", en: "A place name with coordinates" },
    note: {
      ja: "GeoNames の「東京」。RDF/XML で返ってきます。多言語の地名と緯度経度、上位の地名（日本）へのリンクがあります。",
      en: "Tokyo in GeoNames, returned as RDF/XML: names in many languages, coordinates, and a link up to its parent place (Japan).",
    },
    uri: "https://sws.geonames.org/1850147/",
    features: ["rdfxml"],
    site: "https://www.geonames.org/1850147/",
  },
  {
    id: "sedb-case",
    added: "2026-11-02",
    source: { ja: "社会実験事例データベース", en: "Social-experiment case database" },
    title: { ja: "研究プロジェクトのデータを、語彙ごと読む", en: "A research project's data, read with its vocabulary" },
    note: {
      ja: "東京大学の低炭素社会実験の事例（sedb）。元のドメインは止まっていますが、公開されている Turtle に読み替えます。独自の語彙も読むので、属性名が日本語で出ます。",
      en: "A case from the University of Tokyo's low-carbon social experiments (sedb). The original domain no longer answers, so Musubi reads the published Turtle instead, along with its own vocabulary for property names.",
    },
    uri: "http://low-carbon.k.u-tokyo.ac.jp/059cc1cca31ac7400e89b9d80ec880cb",
    features: ["rewrite", "vocab"],
    site: "https://low-carbon-k.github.io/sedb/",
  },
  {
    id: "railclass-ice-t",
    added: "2026-11-02",
    source: { ja: "RailClass", en: "RailClass" },
    title: { ja: "鉄道車両の形式を、Wikidata の名前で", en: "A rail vehicle class, named from Wikidata" },
    note: {
      ja: "鉄道車両の形式のデータ（RailClass）の ICE T。運営者や路線は Wikidata の名前で日本語になり、3D モデルや塗装の色まで自動で開いてたどれます。",
      en: "ICE T in RailClass, a dataset of rail vehicle classes. Operators and lines are named from Wikidata, and its 3D models and livery colours open automatically.",
    },
    uri: "https://w3id.org/railclass/Q696668",
    features: ["nested", "image", "rewrite"],
    site: "https://railclass.ldas.jp/",
  },
  {
    id: "skos-preflabel",
    added: "2026-11-02",
    source: { ja: "W3C", en: "W3C" },
    title: { ja: "語彙の定義を引く", en: "Look up a vocabulary term" },
    note: {
      ja: "SKOS の skos:prefLabel。属性の URI をそのまま開くと、その定義が読めます。転送の途中で許可が切れる語彙なので、Musubi は転送の終点を直接取りに行きます。",
      en: "SKOS's skos:prefLabel. Open a property URI as it is and read its definition. A redirect step loses the CORS permission here, so Musubi fetches the end of the redirect directly.",
    },
    uri: "http://www.w3.org/2004/02/skos/core#prefLabel",
    features: ["vocab", "rdfxml", "rewrite"],
  },
  {
    id: "schema-about",
    added: "2026-11-02",
    source: { ja: "schema.org", en: "schema.org" },
    title: { ja: "Web 頁に埋め込まれたデータを取り出す", en: "Pull data out of a web page" },
    note: {
      ja: "schema.org の about の頁。ふつうの HTML の頁ですが、中に埋め込まれた JSON-LD・microdata・RDFa を取り出して表にします。",
      en: "The schema.org page for about. It is an ordinary HTML page; Musubi extracts the JSON-LD, microdata and RDFa embedded in it.",
    },
    uri: "https://schema.org/about",
    features: ["html", "vocab"],
  },
  {
    id: "ndl-relay",
    added: "2026-11-02",
    source: { ja: "国立国会図書館", en: "National Diet Library" },
    title: { ja: "許可の無い相手は、中継して読む", en: "Sources without CORS, read through the relay" },
    note: {
      ja: "国立国会図書館の典拠（Web NDL Authorities）の葛飾北斎。RDF は返ってきますが、別のサイトからの読み込み（CORS）が許可されていないので、ブラウザだけでは読めません。こうした相手に限って、Musubi は中継のサーバを通して取りに行きます。",
      en: "Hokusai in the National Diet Library authorities. It returns RDF but does not allow cross-origin reads (CORS), so a browser alone cannot load it. For such sources only, Musubi fetches through a relay server.",
    },
    uri: "http://id.ndl.go.jp/auth/entity/00270331",
    features: ["relay", "rdfxml"],
    site: "https://id.ndl.go.jp/auth/ndlna/00270331",
  },
];
