# TASK F — Pico正式素材差し替え

## Git安全確認

- 開始branch: `codex/deadline-tutorial-restore`
- 開始HEAD / TASK E.1: `3621a5e30d103447efb3625272b49d5ff84e341d`
- TASK E / その親: `69bf3a2a96135df02ebd865b3abcd5c038014159`
- 開始時のstaged / unstaged / 非ignored未追跡ファイル: すべてなし。
- 作業branch: `codex/deadline-pico-final`
- 保護branch: `backup/deadline-before-pico-final-20260906`
- origin: `https://github.com/homura-stack/deadline.git`。merge / pushは行わない。

変更前に既存の復元用bundle `<local-backup-path>/deadline-task-e1-complete-20260906-3621a5e/deadline-e1.bundle` を検証した。完全な履歴とE.1のHEADを含むことを確認済み。TASK E／E.1のbranchは保持し、保護branchを作成してから作業branchへ切り替えた。未保存の作品変更はなく、開始時点を復元できる。

## 正式素材

| 項目 | 内容 |
| --- | --- |
| 新素材 | `assets/characters/pico-final.png` |
| 元添付 | `codex-clipboard-4b1862cc-6963-4edd-aef4-44a68ef8d02d.png` |
| 寸法 | 1295 × 1214 / RGBA |
| 新素材SHA-256 | `df2d8295764d489b79b41bd079e5b554f7f601138bdbc4bd436923ae059d3faf` |
| 旧素材 | `assets/characters/pico.png`（1322 × 1190） |
| 旧素材SHA-256 | `fb3e748eb3c9b8d8553af03b4bf0921f8f3a79f65ce6ad5bafabdc12d8b378ee` |

添付PNGをバイト単位で同一のまま追加。画像の再生成・切り抜き・リサイズ・色変更はしていない。alphaは0〜255で、黒い背景画像を貼り付けたものではない。旧素材・集合画像・敵素材はいずれも削除も変更もしていない。

## 参照の切り替え

| 箇所 | 変更と適用先 |
| --- | --- |
| `character-assets.js` | `pico.file`だけを正式PNGへ。通常戦闘、実習のCanvas、EXECUTE、高速移動中の本体、被弾、LIGHT RESTOREDの共通キャッシュに適用 |
| `index.html` | FIRST FLIGHTの画像1箇所と、旧チュートリアル説明図4ページの画像4箇所 |
| `world-map.js` | WORLD MAPのPico画像1箇所。復旧後マップ・SYNC中も同じ参照 |

実行コード上のPico参照は計7箇所。変更前後のソース比較では、参照名の置換とFIRST FLIGHT画像のintrinsic height修正以外に差分がない。タイトル画面の構成・演出・コピーは変更していない。

## 表示サイズ・中心・色

- 戦闘の論理幅 **48** を維持。高さは元画像比率により約43.21 → **45.00**へ自動算出される。非等方スケーリングはしない。
- anchor **(.56, .47)** を維持。画像の全外形ではなく頭部をゲーム座標へ合わせ、LINE始点・高速移動位置・判定中心・復旧時のPico位置に使う。
- alpha 128以上の主な外形は、新素材で論理約**38.5 × 39.2**、旧素材で約**41.1 × 39.6**。描画幅を増やさずに視認性を確認した。
- 説明図は従来の50 × 49のSVG領域、WORLD MAPは62 × 62のSVG領域を維持。`preserveAspectRatio`の等比表示により画像の縦横比を保つ。
- FIRST FLIGHTのCSS表示幅150px（狭い画面では130px）と`height:auto`を維持。HTMLの寸法ヒントだけ160 × 156 → **160 × 150**にして新画像比率へ合わせた。
- 黄金LINE、残光、復旧の光、Picoの発光処理は変更しない。
- **当たり判定はPico半径9、敵15、敵弾5のまま**。羽・触角の先端は判定に含めない。

`game.js`、`config.js`、`simulation.js`、`renderer.js`、`stage-art.js`、`journey.js`、`battle-art.js`、`audio.js`、チュートリアル制御・CSS、WORLD MAPの進行制御、既存テストに変更はない。敵AI・弾幕・LIFE・SCORE・WAVE・AREA・LIGHT RESTORED・SYNC・ENDING・チュートリアル進行を維持する。

## 検証

2026-09-06、**Chrome 152.0.7977.82**（headlessで実際のマウス・キー・タッチ相当入力）を使用。

- Node **75 / 75 PASS**。本編のTIME STOP、当たり判定、WAVE・AREA、旧チュートリアルの条件を含む。
- 画像差し替えの影響範囲に対応する既存Chrome **8スクリプト PASS**。`pico-browser.cjs`、`pico-tutorial-browser.cjs`、`tutorial-touchpad-browser.cjs`、`astra-browser.cjs`、`world-map-browser.cjs`、`restoration-browser.cjs`、`battle-visual-browser.cjs`、`stage-performance-browser.cjs`。テストファイル自体は変更していない。
- TITLE → TRAINING、4ページ説明、2 TARGET実習、黄金LINE、EXECUTEと描画終点、完了 → WORLD MAP → GARDENを確認。WORLD MAPからの再練習も本編状態を保つ。
- 被弾 → GAME OVER → リトライ、GARDENの2 WAVE → LIGHT RESTORED → FORGEを確認。
- 全地区の通し試験は10 WAVE → 5地区の復旧 → SYNC → ENDING → 再開始まで成功。全5地区で復旧の起点がPicoの実行終点と一致し、描画によるWorld変更が0であることを検証した。
- 初回の全地区試験はWAVE 7の自動ルート入力がSTOP制限時間を超えて終了した。ゲーム・テストのコードを変更せず単独で再実行し、全行程が成功した。初回ログも検証成果物に残している。
- 1920×1080、1280×720を含むPCの5段階リサイズ、縦向き390×844、横向き844×390、reduced motion、DPR 2を確認。ゲーム画面・説明図・WORLD MAP・復旧演出のスクリーンショットで、新Picoの頭・表情・羽を確認。弾幕やTARGETを隠すような拡大や、中心位置の追加調整は不要と判断した。
- Chromeで測定した新PNGの縦横比誤差0、四隅alpha 0、anchor alpha 253。透明画素約59.4%。暗い背景・明るい背景とも矩形の背景や不自然な縦横比はない。
- ブラウザDOMの6画像参照とCanvas共通素材1参照がすべて正式PNG。通信ログの旧`pico.png`リクエストは0。通常操作のConsole error、pageerror、画像ロードエラーは0。
- 意図的な画像遅延・取得失敗の既存試験もPASS。代替描画で開始でき、回復時にWAVEやスコアをリセットしない。`file://`でも画像4種を取得できる。
- 負荷試験の4倍CPU／DPR 2でも戦闘描画p95約5.1ms、フレーム間隔p95約16.8ms。新画像は従来と同じ幅192pxの描画用キャッシュへ1度だけ読み込む。
- JavaScript構文確認、`git diff --check`、元添付とのハッシュ一致、旧画像のハッシュ維持、ゲーム制御コードと既存テストの無差分確認はPASS。

証跡: `tests/artifacts/task-f/final-results.json`、`reference-audit.json`、`asset-acceptance.json`、`restoration-final.json`。画面画像は既存試験の`pico/`、`astra/`、`tutorial-e1/`、`journey/`、`restoration/`などに出力される。検証用ファイルはGit対象外で、納品時にバックアップへ保存する。物理スマートフォンでの実機確認は行っていない。

## Windowsでの起動・復元

```powershell
cd .
python -m http.server 4186 --bind 127.0.0.1
```

既にサーバーが起動中なら重ねて起動せず、Chromeで `http://127.0.0.1:4186/` を再読み込みする。

TASK E.1へ戻す場合は、上のプロジェクト内で`git status`がcleanであることを確認してから `git switch codex/deadline-tutorial-restore`。TASK Fへ戻す場合は `git switch codex/deadline-pico-final`。切り替え後はブラウザを再読み込みする。未保存変更がある場合は切り替えを止め、その変更を先に保存する。削除や`reset --hard`は不要。
