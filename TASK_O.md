# TASK O — World Map Pico & Official Logo Integration

## 結果

WORLD MAPの現在地Picoと正式タイトル画像を実装。**HUDの正式ロゴ差し替えは素材不足として保留**。
ゲームルール・難易度・音声・TRAINING・進行／セーブ形式は変更していない。
commit / push / staging / ファイル削除は行っていない。

## 1. WORLD MAPの現在地Pico

- 既存の正式透過画像 `assets/characters/pico-final.png` を再利用。画像自体、ゲーム中のサイズ・anchorは変更なし。
- 従来の小さなSVG内表示を、幅44〜68 CSS pxの独立した現在地マーカーへ置換。
- AREAノードの斜め上へ配置。COREと小画面GARDENのみ隣接AREA名を避けるオフセットを設定。
- 上下3px・2.8秒周期のホバリングと、弱い金色の静的glow。Reduced Motionではホバリングを停止しglowを維持。
- 復旧済み背景の上、AREAラベルの下に描画。マーカーは入力を遮らない。
- 画像失敗時は小さな既存文字種の `PICO` 表示へ退避。マップ選択・ゲーム開始は継続可能。

## 2. 位置の算出元と既存の保存仕様

`WorldMapView.currentArea(state)` は `Math.min(journey.areas.length - 1, state.restored)` のみを参照する。

| restored | Picoの現在地 |
|---:|---|
| 0 | AREA 1 GARDEN |
| 1 | AREA 2 FORGE |
| 2 | AREA 3 CANAL |
| 3 | AREA 4 SKYLINE |
| 4〜5 | AREA 5 CORE |

`selected` / `active` / `replay` は位置に使用しない。既存の選択カーソル・`aria-pressed`・現在地の `aria-current` を維持。
AREA復旧完了で既存の `restored` が更新された後、マップ復帰時に移動する。過去AREA再挑戦中／終了後は進行位置を維持する。
専用のPicoセーブ値や進行の書き込みは追加していない。

**現在のゲームはキャンペーン進行をlocalStorageへ保存していない。** 保存対象はTRAINING受講・音量等の設定で、
ページ再読込やタイトルからの再開では従来どおりGARDENから始まる。
今回はセーブ形式変更禁止のため、この挙動を維持した。保存済みキャンペーンの復元機能を追加したという意味ではない。
既存設定の再読込と、既存進行データからのマーカー再計算をテストする。

## 3. タイトル画面

- ユーザー提供 `title.png` をバイト同一で `assets/title/title.png` へコピーして採用。
- 1678 × 937の縦横比、`object-fit: contain`、原寸上限を維持。クロップ・引き伸ばし・再圧縮なし。
- 画像にロゴとサブタイトルが含まれるため、通常時は既存HTML見出しを視覚的に隠す従来方式を維持。
- START / TRAINING / HOW TO PLAY / SETTINGS / CREDITS、および既存の入力・遷移は維持。
- 縦長画面では画像の下へメニューを分離。PCのボタン領域はロゴ・字幕・Picoを避ける。
- 画像失敗時は既存の文字タイトルを表示し、操作可能。新しい代替デザインは作成していない。

## 4. HUDロゴ — 保留

`logo-hud.png` は未提供かつリポジトリに存在しない。
既存の `assets/logo-deadline.png` は青い旧デザインで、今回の正式ロゴとは異なるため流用しない。
`logo.png` の左下のロゴ先端と日本語サブタイトルは高さが重なっており、矩形の切り出しだけでは
「正式ロゴを欠損させず、サブタイトルだけを除く」ことができない。
不定形マスクによる境界加工は元デザインの品質を保証できないため実施しなかった。

必要素材: **`logo-hud.png` — 透過PNG、メインロゴ＋星／軌道／下線、サブタイトルなし、十分な解像度**。

HUDは従来の文字表示をそのまま維持。ロゴ全体の極端な縮小、AI生成、描き直し、別フォントによる代替制作なし。
提供された正式 `logo.png` は原本のまま保存し、タイトルへの重ね表示やHUDへの読み込みはしていない。

## 5. 使用・保存した画像

| 画像 | 用途 | 加工 |
|---|---|---|
| `assets/characters/pico-final.png` | 現在地Pico（既存正式素材） | なし |
| `assets/title/title.png` | 正式タイトル全景 | 原本コピーのみ |
| `assets/title/logo.png` | 正式ロゴ原本保存、HUD用素材の確認 | 原本コピーのみ／画面未使用 |

元ファイルは `<local-download-path>/title.png` と `logo.png`。
解像度・バイト数・SHA-256は `assets/title/README.md` に記録。旧画像はすべて保持。

## 6. 今回の変更ファイル

既存のTASK J〜M等の未コミット差分とは区別した、TASK Oのみの一覧。

- `index.html`
- `title-pico.css`
- `world-map.js`
- `world-map.css`
- `assets/title/title.png`（追加）
- `assets/title/logo.png`（追加）
- `assets/title/README.md`
- `tests/official-visual.test.cjs`（追加）
- `tests/official-visual-browser.cjs`（追加）
- `tests/title-helpers.cjs`
- `tests/browser.cjs`
- `tests/title-quality-training-browser.cjs`
- `tests/title-routes-browser.cjs`
- `tests/world-map-browser.cjs`
- `TASK_O.md`（追加）

作業開始時のトップレベルJS/CSS/HTMLハッシュとの比較では、変更は上記の本番4ファイルのみ。
`config.js` / `game.js` / `journey.js` / `simulation.js` / `audio.js` / `renderer.js` / `character-assets.js` /
`styles.css` / `ui-polish.css` / `tutorial.js` / `tutorial.css` / `title-screen.js` 等は開始時と同一。

## 7. 検証

- Node: `node --test tests/*.test.cjs` — **100 / 100 PASS**。
- Chrome全25スクリプト: 初回 **24 / 25 PASS**。`wave-k-browser.cjs` はWave 7の自動経路探索で
  `No safe approach to a Wave enemy`。その他24件（TASK O専用、実AREAクリア／再挑戦を含む）はPASS。
  **コード無変更の再実行ではWave 1〜10・ENDINGまでPASS（exit 0、JavaScript例外0）**。
  初回失敗の原因は未確定。同じ失敗→無変更再実行PASSが前回READY調整時の記録にもあるが、
  再実行成功を安定性や体感難易度の保証とは扱わない。Wave・経路探索・救済条件は変更していない。
  初回失敗のログは `tests/artifacts/task-o/suite-logs/`、再検証は `tests/artifacts/task-o/rechecks.json` に保持。
- TASK O専用Chrome: PC／タッチ相当、全5現在地＋全復旧状態、9画面条件×6進行状態の54配置でノード・AREA名との非重なりを確認。
- 実AREAクリア／過去AREA再挑戦の既存テストにも、現在地が進む／戻らないことの検証を追加。
- 既存タイトルテストの画像寸法・原本ハッシュ・画像失敗対象を正式PNGへ更新。ルートやレイアウトの検証は削除していない。
- Reduced Motion、画像読み込み、操作UI、フォールバック、既存設定の再読込、JavaScript例外を確認。
- TDDに従い、新しい位置算出と正式画像の期待値が旧実装で失敗することを先に確認。
  視覚確認で見つかった復旧背景の被覆も、重なり順の回帰テストを失敗させてから修正した。
- `tests/artifacts/task-o/official-visual.json` とスクリーンショット、全件ログは同ディレクトリの `suite-logs/`。
- PC／タッチ相当の画像を目視確認。物理スマートフォンや人間の瞬間的な認識しやすさは未検証。
- 変更JS・テストの `node --check`、`git diff --check` はPASS。ステージ済みファイルなし。

実プレイ経路の確認画像: `tests/artifacts/task-o/map-real-forge.png`（GARDEN復旧直後）と
`tests/artifacts/task-o/map-real-garden-touch.png`（タッチ相当の初回GARDEN）。

## 8. 次回人間が確認する項目（最大4項目）

1. PC／実機スマホでタイトルのロゴ・字幕・Picoが切れず、START等が押しやすいか。
2. WORLD MAPでPicoの現在地と、過去AREAの選択カーソルを一目で区別できるか。
3. AREA復旧・過去AREA再挑戦後のPico位置と、Reduced Motion時の見え方が自然か。
4. 正式な字幕なし `logo-hud.png` を用意し、次回HUD統合時に実サイズで輪郭・控えめさを確認する。
