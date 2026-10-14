# ブラウザだけで動く Linked Data ブラウザ

目的: URI を入れると、その RDF をブラウザが直接取りに行き、表にして、リンクをたどれるようにする。
最初の目標は RailClass（https://nakamura196.github.io/railclass/）と Wikidata を行き来できること。
LOD チャレンジ 2026（締切 2027-01-05）で RailClass を見せる道具にもする。

着想: 神崎正英「LD Browser」（2014、https://www.kanzaki.com/works/2014/pub/ld-browser 。
2026-10 時点で "temporarily disabled due to over access" の 500。
保存版 https://web.archive.org/web/20250401124432/http://www.kanzaki.com/works/2014/pub/ld-browser ）。
神崎版はサーバ側（PHP / ARC2）で任意の URI を取りに行く作りで、アクセス過多で止まった。
こちらはサーバを持たないので、その問題が起きない。代わりに、相手が CORS を許可していないと読めない。

## 2026-10-11 計画と v0

### 範囲（段階）

1. v0（この日）: 静的な頁 1 枚。URI → 取得先の読み替え表、Turtle / N-Triples / JSON-LD の読み込み、
   表での表示、同じ文書内の入れ子、別文書へのリンクをその場で開く（▸）、日本語ラベル優先、
   Wikidata → RailClass の逆リンク
2. v1: RDF/XML の読み込み（SKOS・OWL など古い語彙が RDF/XML しか返さない）、
   小さなグラフ図（神崎版の表ごとの図、LodLive 式のノード展開）、読み込めなかった理由の表示を細かく
3. v2: GitHub Pages で公開、RailClass の頁から「LD Browser で見る」リンク、w3id 切り替え後の確認
4. 範囲外（当面）: CORS を許可しない相手のための中継サーバ。神崎版が止まった理由そのものなので、入れるなら別に考える

### 作りの決めごと

- ビルドなしの ES モジュール。依存は CDN（jsDelivr）から版を固定して読む: n3@1.17.4（2024-06 公開）、
  JSON-LD を読むときだけ jsonld@8.3.3。
  n3 の最新 2.13.12 は 2026-10-10 公開で、2.x は数日おきに出ているので避けた（公開から 2 週間たたない版は使わない）
- 取得先の読み替え（`src/resolve.js`）:
  - RailClass: 公開中の RDF の URI は旧アドレス `https://nakamura196.github.io/train-bodies/rdf/...` のまま（開くと 404）。
    w3id（perma-id/w3id.org#6867、未取り込み）の `https://w3id.org/railclass/...` と合わせ、
    どれも `https://nakamura196.github.io/railclass/rdf/<class|model>/<id>.ttl` に読み替える
  - Wikidata: `entity/` `prop/direct/` `wiki/` などの書き方を全部 `Special:EntityData/<id>.ttl?flavor=simple` にする（1 項目 約 9 KB）。
    ラベルは別に `wbgetentities`（`origin=*` で CORS 可）で 50 件ずつまとめて引く
  - そのほか: `http://` は `https://` に替えて取りに行く（下の「分かったこと」1）
- 2 MB を超える文書は読まない（RailClass の `all.ttl` は 8 MB）

### 確かめたこと（手元 http://127.0.0.1:8765 、Chrome）

- RailClass の形式（cls:Q696668 ICE T）: 20 トリプル。属性名と値が Wikidata のラベルで日本語になる（運営者 → ドイツ鉄道 など）
- RailClass のモデル（icet_411）: 61 トリプル。モデル → 形式を自動で 1 段開き、形式の「路線での運用」（#line1 など）が入れ子で出る
- Wikidata（Q696668）: 198 トリプル。ラベルは日本語・英語を先に出し、他の言語（18 件）は畳む。
  「RailClass にこの形式があります」のリンクから RailClass へ戻れる
- たどる・戻る: RailClass → Wikidata のドイツ鉄道（Q9322、134 行）→ ブラウザの「戻る」で戻れる

### 分かったこと（自明でないもの）

1. **http→https の転送には、たいてい CORS の許可が付かない。** `http://www.w3.org/2004/02/skos/core` は最初の 301 に
   `Access-Control-Allow-Origin` が無く、ブラウザが止める（curl では最終応答に付いているので気づきにくい）。
   https で直接取りに行けば rdfs（87 トリプル）・prov（1,664 トリプル）は読めた
2. **転送の途中に許可の無い段があると、最終応答に許可があっても読めない。**
   - `purl.org/dc/terms/` は purl.archive.org を経て `http://dublincore.org`（許可なし）を通る
     → 最終の `dublin_core_terms.ttl` を読み替え表に直接書いた
   - SKOS は https でも 303 の段に許可が無く、しかも返すのは RDF/XML → v1 で RDF/XML と一緒に対応
3. GitHub Pages は `Access-Control-Allow-Origin: *` を付ける。RailClass の頁を置いたままで、ブラウザから読める
4. schema.org の `http://schema.org/name` は、Accept を付けても HTML を返した（RDF の版は別の URL）。v0 では「HTML が返りました」と出すだけ

### 先行事例（2026-10-11 の調べ。サブエージェントによる、要一次確認）

- LodLive（Camarda ら、https://github.com/dvcama/LodLive 、MIT、最終更新 2020-04）: SPARQL 窓口が前提のグラフ表示
- LodView（https://github.com/dvcama/LodView 、MIT、2023-12）: Java のサーバ型。自分のデータの URI を HTML にする
- SolidOS / mashlib（Tabulator の後継、https://github.com/solidos/mashlib 、MIT、2026-10 も更新）: 入れ子の表。ブラウザ内で取得できるが Solid 向けで大きい
- Comunica（https://github.com/comunica/comunica ）: ブラウザで動くリンクたどりの問い合わせ部品。表示ではない
- Micsik, Turbucz, Györök "LODmilla: a Linked Data Browser for All", CEUR-WS Vol-1224（年は未確認）: 表形式とグラフ形式の長所を併せる、複数データセットの横断
- OpenLink Structured Data Sniffer（ブラウザ拡張）
- 自分の過去の取り組み: `nakamura196/snorql`（SPARQL 窓口に問い合わせる画面。URI を直接たどる道具ではない）、
  Zenn「ORCIDのRDFを確認する」（2023-04、神崎版を使った記事）。同じ道具は作っていない
- LOD チャレンジで LD ブラウザそのものが入賞した例は、見つからなかった（「無い」とは言えない。lodc.jp の各年の結果で確かめる）

- 主張の候補: サーバを持たない LD ブラウザは、神崎版を止めた「アクセス過多」の問題を構造的に持たない。
  その代わり、読めるかどうかは相手の CORS 次第になり、主要な語彙でも転送の途中で許可が切れて読めないものがある（上の 1・2）。
  これは公開側への具体的な提言にできる（転送にも `Access-Control-Allow-Origin` を付ける）

### 確かめていないこと

- スマートフォンの幅での見え方
- Safari・Firefox での動作
- 循環する参照（A → B → A）を深く開いたときの止まり方（深さ 4 で打ち切る作り）

## 2026-10-11 v1 その 1: RDF/XML の読み込み

### したこと

- `src/rdfxml.js` を自作した（約 170 行）。ブラウザに最初からある XML の読み込み（DOMParser）の上に、RDF/XML の文法を載せた。
  依存は増やしていない。既存の部品（rdfxml-streaming-parser）は Node のストリーム前提で、ビルドなしの CDN 読み込みでは動くか分からないため、使わなかった
- 対応: 型付きの節、rdf:about / ID / nodeID / resource、属性での値、rdf:li、xml:base と xml:lang の受け継ぎ、
  rdf:datatype、parseType の Resource / Literal / Collection。
  対応していないもの: 述語要素に付いた rdf:ID の具体化（reification。トリプル自体は取る）
- `src/fetchrdf.js`: `application/rdf+xml`、および中身が RDF/XML の `application/xml` / `text/xml` をこの部品に回す
- `src/resolve.js`: SKOS（`http://www.w3.org/2004/02/skos/core`）を転送の終点 `https://www.w3.org/2009/08/skos-reference/skos.rdf` に直接読み替えた。
  303 と 301 の段に CORS の許可が無いため（v0 の「分かったこと」2）

### 確かめ方と結果

rdflib 7.5.0 と突き合わせた。両方とも、トリプルを 1 行ずつの文字列にし、空白ノードを `_` に置き換えて並べ替え、SHA-256 を比べた。
道具は `test/check-rdfxml.html`（ブラウザ側、`canon(url)`）と `test/rdflib-canon.py`（rdflib 側）。

| 文書 | トリプル数 | 一致 |
| --- | --- | --- |
| `test/rdfxml-cases.rdf`（上の文法を全部入れた手作りの例） | 35 | 一致 |
| SKOS（skos.rdf） | 252 | 一致 |
| OWL（`https://www.w3.org/2002/07/owl`、RDF/XML で要求） | 450 | 一致 |
| RDF（`22-rdf-syntax-ns`） | 127 | 一致 |
| RDFS（`rdf-schema`） | 87 | 一致 |

- 突き合わせで 1 件の誤りが見つかった: 型付きの節（`<skos:Concept rdf:about=…>`）で、述語と目的語を逆に入れていた。件数は同じなので、件数だけの比較では気づけなかった
- 生の出力には重複したトリプルがある（SKOS で 254 → 重複を除いて 252）。表示に使う N3 の Store が重複を除くので、表には影響しない
- 画面: `skos:prefLabel` を開くと、ラベル・説明 3 件・定義と、`rdfs:isDefinedBy` の先の SKOS 語彙そのもの（作成者など）が入れ子で出た

### 分かったこと

1. FOAF（`https://xmlns.com/foaf/0.1/`）は RDF/XML を返すが、`Access-Control-Allow-Origin` が無い。読み替えでは救えない
2. w3.org の OWL・RDF・RDFS は、こちらの Accept（Turtle 優先）には Turtle を返す。RDF/XML の部品を通るのは、Turtle の版が無い SKOS など

### 神崎版のグラフ図（保存版の「簡単な機能説明」を読んだ）

- 神崎版は、表ごとに「RDFグラフの視覚化」を呼び出して図を描けた。描くのは別の道具
  （https://www.kanzaki.com/works/2009/pub/graph-draw 、神崎版の中ではなく、そちらに渡す作り）
- 約 300 トリプルを超えると図が大きくなりすぎるので、ボタンを出さない
- ほかに、リンクの横の「+」で今の表示に別の URI のグラフを足して見る、RDF リストを 1 つの表にする、
  入れ子の深さを選べる（既定 2）、取得の上限 200 KB、HTML から microdata を取り出す、などがあった
- v1 の「小さなグラフ図」は、この「表ごと・300 トリプルまで」を目安にする

## 2026-10-11 v1 その 2: 小さなグラフ図

### したこと

- `src/graph.js`（約 350 行、依存なし）。表ごとに「グラフ図（N トリプル）」のボタンを置き、押すと表の下に SVG の図を出す。
  ボタンを置くのは、最初の表と、▸ で開いた別文書の表
- 図にするのは「その表が見せているトリプル」: 主語の記述と、同じ文書の中で入れ子にしている空白ノード・資源の記述（深さ 4 まで、表と同じ）
- 300 トリプルを超える表は、ボタンの代わりに「グラフ図は 300 トリプルまでです（この表は N）」と出す（神崎版の目安）
- 選んだ言語と英語以外のラベルは図に入れない（Wikidata の ICE T で 65 件。図の下に件数を出す）
- 配置は自前の力学モデル（Fruchterman–Reingold、300 回）。最初の位置を主語からの距離で同心円に置くので、毎回同じ図になる
- 描き方: 資源は角丸、リテラルは四角、空白ノードは点線の丸、主語は塗りつぶし。線には属性名（日本語ラベルがあればそれ）
- 操作: 背景のドラッグで移動、ノードのドラッグで動かす、資源のノードを押すとその資源を開く、＋／−／全体、Ctrl（ピンチ）＋ホイールで拡大縮小（ふつうのホイールはページのスクロールに残した）、SVG で保存
- 全体を入れると字が 9 px より小さくなる大きさの図は、最初は主語の周りを読める大きさで出し、「全体」で全部を見せる

### 確かめ方と結果（headless Chromium、playwright）

| 表 | トリプル | ノード | 配置と描画 |
| --- | --- | --- | --- |
| Wikidata ICE T（Q696668） | 30（ほか 65 件のラベルを省略） | 31 | — |
| RailClass モデル icet_411 | 61 | 59 | — |
| RailClass 形式 Q696668（モデルの表で自動で開いた分） | 80 | — | — |
| 合成データ（主語 → 30 資源 → 各 9 リテラル） | 300 | 331 | 188 ms |

- 暗い配色でも読めることを画面で確かめた
- ノードのドラッグでは頁が移らず、押すと移ることを確かめた

### 試して直したこと

1. 型（rdf:type の先）を 1 つのノードにまとめると、どの主語も同じ型ノードに引かれて中央で線が絡んだ。
   型の先だけはリテラルと同じく主語ごとに別のノードにした
2. 理想の線の長さを図の大きさで伸ばしていたら、300 トリプルで線が画面の外まで伸び、中央が空いた。
   長さを 80 に固定し、離れた相手（320 以上）とは押し合わないようにした。配置の時間も 549 → 188 ms に減った
3. 押した瞬間に図全体がポインタを握る（setPointerCapture）と、クリックがリンクではなく図に届き、ノードを押しても移らなかった。
   動き始めてから握るようにした

### 確かめていないこと

- Claude in Chrome（拡張）では、この日は頁を開けなかった（「開いた」と返るがタブが新しいタブのまま）。確かめは headless Chromium だけ
- 神崎版の「＋」（今の図に別の URI のグラフを足す）、LodLive 式のノード展開は入れていない
- スマートフォンでの指の操作

## 2026-10-11 Astro にした、トップ頁、HTML に埋め込まれた RDF

### 頁の作り: Astro で静的に書き出す（SSR は使わない）

- 取得も表示もブラウザの中で行うので、サーバで頁を組み立てる必要が無い。SSR を入れると「サーバを持たない」という前提が崩れる
- Astro 7.3.5（RailClass の web/ と同じ版）。頁は `/`（トップ）、`/browse/?u=…`（表示）、`/about/`。ヘッダーとフッターは `src/layouts/Base.astro` の 1 か所
- 既存のスクリプトは `src/` から `public/app/` に移し、Astro に通さずそのまま配る。jsDelivr から版を固定して読む作りを変えないため
- `base` は仮に `/ld-browser`（GitHub のリポジトリはまだ無い）
- 却下: ビルドなしのまま、ヘッダーを JS で差し込む。頁が増えるたびに手で揃えることになり、JS が動かないとヘッダーが出ない

### HTML に埋め込まれた RDF（神崎版の microdata 取り出しにあたる）

v0 では、HTML が返ると「HTML が返りました」で止めていた（例: `https://schema.org/about`）。
神崎版は HTML から microdata を取り出していた（上の「神崎版のグラフ図」の節）。これを入れた。

- `public/app/html.js`（依存なし、DOMParser の上）:
  - `<script type="application/ld+json">`: 既存の JSON-LD の読み込みに渡す
  - microdata: W3C「Microdata to RDF」に沿って簡略化。itemid が無ければ空白ノード、itemtype から語彙を決める（`https://schema.org/Person` → `https://schema.org/`）、
    頁から最上位の項目へ `md:item`（`http://www.w3.org/ns/md#item`）を張る
  - RDFa: よく使う部分（vocab、prefix、about、typeof、property、rel、resource / href / src、content、datatype、lang）。
    初期の接頭辞（RDFa 1.1 initial context の一部。`og:` を含む）を持つので、Open Graph も取れる。
    `rel="stylesheet"` のような、接頭辞も vocab も無い語は RDF にしない
- どこからも指されていない空白ノード（頁に埋め込まれた、@id の無い JSON-LD など）は、主語からたどれないので、「名前の無い資源」として別に表にした
- 表で `md:item` は最後に並べる（頁の中の項目は、資源そのものの説明ではないため）

確かめたこと:

| 頁 | 結果 |
| --- | --- |
| `https://schema.org/about`（CORS 許可あり、16 KB） | JSON-LD 14 + microdata 25 = 39 トリプル。語の定義（rdf:Property、ラベル、説明など）と、パンくず・例のコードの microdata |
| `test/html-cases.html`（手作り。JSON-LD・microdata・RDFa・Open Graph） | JSON-LD 3、microdata 8、RDFa 10。21 件すべて手で見積もった期待どおり |
| `https://nakamura196.github.io/railclass/` | 埋め込みなし →「埋め込まれた RDF はありませんでした」 |

- 参照実装（pyRdfa や extruct）との突き合わせはしていない。RDF/XML のときのような一致の確認は、まだ無い

### 確かめていないこと

- RDFa の細かい規則（`rev`、`inlist`、`property` と `rel` が同じ要素にある場合の全パターン、XMLLiteral）
- 実在の RDFa の頁（RDFa を使い、CORS も許可している頁が手元で見つからなかった）

## 2026-10-11 v1 その 3: 読み込めなかった理由を細かく出す

それまでは、fetch が失敗すると何でも「CORS か通信できません」、HTTP の失敗は「HTTP 404」だけだった。
理由を 1 行の見出し・何が起きたか・次に何をすればよいか・記録（状態、Content-Type、読み手の英語の文、止まった行）の 4 段で出すようにした（`public/app/fetchrdf.js`、表示は `render.js` の errorBox）。

分けた種類: URI の形が正しくない / urn: など取りに行けない URI / 時間切れ（20 秒）/ オフライン /
CORS の許可が無い / サーバにつながらない / HTTP 404・410・401・403・406・429・5xx / 大きすぎる /
読めない（Turtle・JSON-LD・RDF/XML・RDF でない XML）/ HTML に RDF が埋め込まれていない / 読めたが 0 トリプル。

- **CORS と「つながらない」の見分け方**: fetch は失敗の理由を教えない（どちらも TypeError）。
  同じ URL を `mode: 'no-cors'` でもう一度取りに行き、返事が来れば（中身は見えないが）サーバには届いている＝許可が無い、
  これも失敗すれば DNS・証明書・停止でつながらない、と判断した。`https://www.google.com/` → CORS、`https://no-such-host.invalid/` → つながらない、で確かめた
- 形式は Content-Type で決め、`text/plain`・`application/octet-stream`・無しのときは先頭の文字で推し量る（`<html` → HTML、`{` → JSON-LD、`<?xml` → XML）。
  推し量って読めなかったときは「相手は text/plain と答えたので、Turtle だと推し量った」と書く
- n3 の誤りの文にある `line N` から、その行を取り出して見せる
- 読めたが、入れた URI を主語とする記述が無いときは、表の前に一言出す
  （例: `https://nakamura196.github.io/railclass/rdf/model/icet_411` は新しい住所。RDF の中の URI は旧 `train-bodies/` なので一致しない。w3id 切り替えで解消する見込み）
- 手元の確認用に、`http://localhost` と `http://127.0.0.1` だけは https に替えずに取りに行くようにした

確かめ方: headless Chromium（playwright）で 13 件。手元の CORS 付きの小さなサーバ（Python）で、壊れた Turtle（3 行目で止まる）、
text/plain の平文、閉じていない JSON、MODS 風の XML、空の Turtle、無いファイル（404）を返した。どれも想定した種類で出た。

同じ日に、グラフ図・拡大縮小・「もっと見る」のボタンと言語の選択欄が、ブラウザ既定の見た目のままだったのを直した（枠と角丸、暗い配色でも見える色）。

### 確かめていないこと

- 時間切れ（20 秒）とオフラインは、実際に起こしていない
- 転送の途中の段だけ許可が無い場合も、no-cors では「届いた」と出る。どの段で切れたかまでは、ブラウザからは分からない
- JSON-LD の @context が取れないときの文（`context` を含むかで判定）は、実例で確かめていない

## 2026-10-11 v2 その 1: GitHub Pages で公開

- 公開先: https://nakamura196.github.io/ld-browser/ （リポジトリ nakamura196/ld-browser、public）
- 手元でビルドし、`dist/` を gh-pages ブランチへ強制 push する（`scripts/deploy-pages.zsh`、RailClass と同じ形）。Actions は使わない
- 返答に `Access-Control-Allow-Origin: *` が付くことを確かめた（他のサイトからこの頁の資源も読める）
- 確かめた例: 旧 URI `train-bodies/rdf/class/Q696668`（直接開くと 404）を渡すと、`railclass/rdf/class/Q696668.ttl` に読み替えて 20 トリプルを表示。コンソールにエラーなし
- 同時に入れたもの: Dependabot（npm、cooldown 付き）、Secret scanning と Push Protection、Dependabot alerts / security updates

### 確かめていないこと

- 公開版で、トップの他の例（3D モデル・Wikidata・SKOS・schema.org）は開いていない
- RailClass の頁からの「LD Browser で見る」リンクはまだ無い（v2 の残り）

## 2026-10-11 v2 その 2: 日英、明暗の切り替え、戻るボタン、独立

- 日英: 日本語は `/`、英語は `/en/`。頁の文言は `src/i18n.ts`、JS が出す文言は `public/app/i18n.js` に辞書で持つ。ラベルの言語は頁の言語に合わせ、別の選択欄は廃止
- 明暗: ヘッダーのボタンで切り替え。初期値は保存した選択、無ければ OS の設定。`<head>` の小さな script で、描画の前に `data-theme` を付ける（ちらつき防止）
- 戻る: 頁内で資源をたどった後だけ「← 戻る」を出す（history.state に深さを持たせる）
- フッターから RailClass へのリンクを外した。この道具は RailClass から独立させる（トップの例には RailClass を例の 1 つとして残す）
- 手元のブラウザで確かめた: 戻る（たどる → 出る → 押す → 元に戻り消える）、言語リンクが `?u=` を引き継ぐ、明暗の切り替えと保存、英語版で Wikidata のラベルが英語になる

## 2026-10-11 v2 その 3: 独自ドメイン browser.ldas.jp

- 名前の検討: `ldas.jp` 本体は LDAS のサイト（Worker）で使用中なので不可。`ld.ldas.jp` は短いが何の頁か分からず、別用途に残したい。`browse.ldas.jp` は頁の `/browse/` と重なる（`browse.ldas.jp/browse/?u=`）。`viewer` は IIIF ビューアを連想させる。→ 道具の名前に合う `browser.ldas.jp`
- DNS: Cloudflare の API で CNAME `browser` → `nakamura196.github.io`、プロキシ無し（GitHub が証明書を発行できるように）。鍵は 1Password「Cloudflare DNS edit ldas.jp」（ldas.jp の DNS 専用）
- ldas.jp には `*.ldas.jp` → Cloudflare Tunnel の受け皿がある。名前を指定した CNAME を足せばそちらが優先される
- Astro の `base` を `/` に、`site` を `https://browser.ldas.jp` に。`public/CNAME` を置き、`gh api -X PUT repos/.../pages -f cname=...` で登録
- 旧 `nakamura196.github.io/ld-browser/` は GitHub が新しい住所へ転送する

## 2026-10-11 v2 その 4: 住所を `/?u=` に短くした

- `browser.ldas.jp/browse/?u=…` は browser と browse が重なる。RailClass の頁にリンクを書き込む前に、`https://browser.ldas.jp/?u=<URI>`（英語は `/en/?u=`）に変えた
- トップ頁が両方を持つ: `?u=` が無ければ紹介、あれば表。`<head>` の script で描画前に `html.viewing` を付け、CSS で出し分ける（ちらつかない）。頁内の行き来は従来どおり pushState
- 旧 `/browse/?u=…` は残し、`location.replace` で新しい形へ送る（静的サイトなので HTTP の転送は使えない）。ナビの「ブラウザ」は廃止
- 見送った案: `/view/?u=`（重なりは消えるが 1 段深いまま）、何もしない（動くが、人目に触れる住所は短いほうがよい）
- 手元で確かめた: 旧住所 → 新住所へ転送、リンクをたどる・戻る、例のカードから開く → 戻ると紹介に戻る、英語版の転送と言語リンクの `?u=` 引き継ぎ

## 2026-10-11 v2 その 5: RailClass からのリンク

- RailClass の形式・モデルの頁の URI の行に「LD Browser で見る」を足した（train-bodies 5e6ff4f、公開済み）。リンク先は `https://browser.ldas.jp/?u=<RDF の URI>`、英語の頁は `/en/?u=`
- URI は RDF に書かれている旧 `train-bodies/` のまま渡す。LD Browser 側で読み替えて取得する。w3id へ切り替えたら両方の URI を差し替える
- 画像（schema:image・foaf:thumbnail・foaf:depiction など）のサムネイル表示は、まだ無い。神崎版の describer.js（Wayback 2025-04-01 の控え）にも、画像を扱う処理は見当たらなかった（本体の別のスクリプトは未確認）

## 2026-10-11 v2 その 6: 画像の値を小さな絵で見せる

- 対象の項目: `schema:image`・`schema:thumbnailUrl`（http/https の両方）、`foaf:thumbnail`・`foaf:depiction`、Wikidata の P18（`wdt:P18` と `ps:P18`）
- 値のセルで、リンクの上に縦 160px・横 240px までの絵を出す。絵を押すと元の画像を別タブで開く。読めない値（画像でない URL など）は絵だけ消え、リンクは残る（`public/app/render.js` の thumb、住所の読み替えは `resolve.js` の imageUrl）
- Wikimedia Commons の `Special:FilePath/…` は `?width=320` を付けて縮小版を取る（元画像は数 MB あることが多い）
- RailClass の RDF の画像の住所も旧 `train-bodies/` のままで、そのままでは 404。表示のときだけ `railclass/` に読み替える
- 手元で確かめた（headless Chromium）: RailClass のモデル allegra（`schema:thumbnailUrl` → 560px の絵が読めた）、Wikidata Q696668 ICE T（P18 → Commons の 330px 版）。コンソールのエラーなし

### RailClass の RDF にある画像の項目（2026-10-11 に数えた）

- モデル 36 件: `schema:thumbnailUrl` あり（3D モデルの縮小画像）
- 形式 28,650 件: 画像の項目は無い。サイトには写真 12,194 枚（出典つき）があるが、RDF には出していない
- 上の 5 種のうち、使っているのは `schema:thumbnailUrl` だけ

### 確かめていないこと

- `schema:image` が ImageObject（空白ノード）のとき。今は絵を出さず、入れ子の表の中の `contentUrl` もリンクのまま
- 公開版での表示（まだ配っていない）

## 2026-10-11 使い方の動画

- 作り方: blog の `common/kokoro`（Kokoro の声を先に作り、その長さで章ごとに撮る。日英を 1 本の台本で）。案件のフォルダは `~/git/blog/blog.worktrees/conventions-2026-10/ld-browser/`（未コミット）
- 章: トップ頁 / 表で読む / グラフ図 / リンクをたどる / URI を入れる / しくみと制約。日本語 5.0 分、英語 4.0 分
- 声を whisper で文字に起こして読みを確かめた。「300 トリプル」が「さんびや く」と切れたので読みの表に足した
- YouTube に限定公開で上げた: 日本語 XNXKw03V55w、英語 gIjU2KkaxAE。公開への切り替えは、1 日 1 本の枠で予約して行う
- トップ頁の「例から始める」の下に埋め込んだ（日本語の頁に日本語版、/en/ に英語版。youtube-nocookie.com）。限定公開でも埋め込みは映る
- 却下: 最初に作った音なし・字幕だけの動画（Playwright で録画し、字幕を頁に重ねた）。最新の作り方に合わないため、台本ごと消した

## 2026-10-11 LOD チャレンジの過去の受賞作（2011〜2025）

- 2011〜2025 の 15 回の受賞ページを見た（サブエージェントが要約ツール経由で取得。下の 2012 年だけ一次資料で確認）
- **「URI を入れて RDF をたどる汎用の LD ブラウザ」の受賞作は見つからなかった。** 神崎版（2014）も 2014 年の受賞一覧に無い（応募したかは不明）
- 名前がいちばん近い 2012 年アプリケーション部門 最優秀賞の「LOD Browser」（a018、安江翔平・藤本椋也・年岡晃一。SparqlEPCU・WebDocManager との 3 作品で受賞）は別物。
  応募作の説明（https://lodc.jp/challenge2012/application.html ）では、自分たちの RDF 格納サイト SparqlEPCU にある緯度経度つきの RDF を
  Google マップに出し、編集もできるもの。特定のデータの地図表示・編集で、任意の URI は開かない
- 周辺の受賞作（どれも汎用の LD ブラウザではない。中身は要約経由で、一次確認していない）:
  2011「DashSearch for SPARQL」（SPARQL の結果の閲覧）、2013「SPARQL Timeliner」（年表と地図）、2016「PROLOQL Extension」（DBpedia を引くブラウザ拡張）、
  2018「LOD フロントエンド」（LOD4ALL の可視化）、2021「MetaStanza」（SPARQL の結果を表・図の部品に）、
  2022「Linked Data API Navi」（SPARQL 窓口のカタログ）、2024「ttl2html」（Turtle から HTML のサイトを作る。サーバ側で事前に作る点が違う）
- 主張の候補: LOD チャレンジ 15 回の受賞作に、任意の URI を開いてたどる汎用の LD ブラウザは無い（上の 15 回の受賞ページが根拠。応募作全体は見ていない）

## 2026-10-13 sedb（社会実験事例データベース）の読み替え

- `public/app/resolve.js` に規則を 1 つ足した。`http(s)://low-carbon.k.u-tokyo.ac.jp/<id>` は、
  どれも `https://low-carbon-k.github.io/sedb/assets/rdf/data.ttl`（全 750 トリプル、39 KB、
  `text/turtle`、CORS あり）を読む。元のドメインはもう応答しないので、URI は識別子としてだけ使う。
- 確認（手元の dev サーバ + Playwright）: 事例「賃貸借契約」（…/059cc1cc…）を開くと se:exRdfName が
  リンクになり、押すと社会実験「コミュニティ拠点(柏ビレジ)」（…/komyunitexikyoten）に移る。
  移った先の「この資源を指す記述」に事例 9 件が出る（sedb の group 画面の 9 件と一致）。
  同じファイルなので 2 回目の取得は起きない。コンソールのエラー 0。
- 残り: 事例・実験の名前が URI のまま出る。se:title / se:exTitle は名前として扱っていない。
  sedb の語彙ファイル（teitanso.org の se: 語彙）は、low-carbon-sedb の動画撮影が終わるまで触らない。
- 同日、名前の件を直した（`public/app/labels.js`）。接頭辞 `se:` を足し、se:title（事例名）と
  se:exTitle（実験名）を名前として読む。事例画面・実験画面・「この資源を指す記述」の 9 件とも、
  URI の前に名前が出ることを確かめた。属性名も `se:condition` のように短く出る。エラー 0。

## 2026-10-13 sedb の語彙で属性名を日本語にする

- sedb 側に語彙ファイル `https://low-carbon-k.github.io/sedb/assets/rdf/vocab.ttl`（116 トリプル、25 属性、日英の rdfs:label、CORS あり）が出たので読むようにした
- `resolve.js` に規則を足した。`http(s)://www.teitanso.org/2012/04/se`（# 付きも）は vocab.ttl を読む。名前空間そのものは 404 のまま
- `main.js`: これまで RailClass だけ語彙を読んでいた分岐を、データセットごとの語彙の表（`DATASET_VOCAB`）にした。sedb の資源を開くと、語彙も読んで属性名を取り込む。語彙が読めないときは今までどおり `se:condition` の形で出る
- 「この資源を指す記述」の属性も、名前があれば名前で出すようにした（RailClass にも効く）
- 確認（手元の dev サーバ + Playwright）: 事例「賃貸借契約」で 24 属性すべてに日本語名（「対応の結果 se:condition」など）、/en/ では英語名。実験画面の「この資源を指す記述」は「関連する社会実験」。`se:title` の URI を開くと vocab.ttl の記述が出る。sedb 由来のコンソールエラー 0
- 限界: 属性の並び順は今も `se:` の短縮形の順（名前の順ではない）

## 2026-10-14 トップ頁のお知らせ欄

- 動画のすぐ下に「お知らせ／News」を置いた。日付と 1 行の文、新しい順。文言は `src/i18n.ts` の `home.news`（日英）。
- 目に見える変更を公開したときに 1 行足す。最初の 5 件は 10-11 の公開から 10-14 の sedb 語彙まで。
