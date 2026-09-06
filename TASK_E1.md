# TASK E.1 — 旧チュートリアル復元とFIRST FLIGHT導線

## 安全な基準点

- 作業開始branch: `codex/deadline-pico-tutorial`
- TASK E / 開始HEAD: `69bf3a2a96135df02ebd865b3abcd5c038014159`
- TASK D / その親: `ce742ca5af0a7e2277fefb527e52d7ce5781185a`
- 作業開始時: staged / unstaged / 非ignored未追跡ファイルはいずれもなし。
- 保護branch: `backup/deadline-task-e-before-e1-20260906`
- 今回のbranch: `codex/deadline-tutorial-restore`
- origin: `https://github.com/homura-stack/deadline.git`。今回はmerge・pushともに行わない。

コード変更前に `D:/Desktop/AIWorkSpace/backups/deadline-pre-task-e1-20260906/` へ全Git参照を含むbundleと作業ファイルZIPを保存した。bundleを検証済み。ZIPは`.git`以外の274ファイルを含み、ignoredの検証成果物も保持し、ファイル数とCRCを検証済み。削除・履歴書換え・既存branchへの上書きは行っていない。

## Gitから確認した旧体験

`git log`、`git log -S`、`git show <commit>:<file>`で調査した。履歴の根拠は実ファイルであり、記憶や参考画像からの再設計ではない。

- `1816c8a`: 初期版。本編内の説明とヒントが中心。
- `af7d087`: 4ページBRIEFINGと、2 TARGETを使う安全なPRACTICEを導入。
- `b42cd67` / `366c37e`: 操作を示す視覚ガイド、押し始めの合図を改善。
- `4cda026` / `69521cf`: 相対移動・描画、MOVE PAD専用タッチ操作を整備。
- `ce742ca5` (TASK D): この4ページと実習が残る最後のPico版。今回の復元元。
- `69bf3a2` (TASK E): 7段階・3 TARGET・独立した回避課題へ変更されていた。

関連ファイルは`index.html`（説明画面と図）、`game.js`（実習World・入力条件・遷移）、`config.js`（配置と時間）、`renderer.js`（操作ガイド）、`styles.css` / `astra.css`（図の動き）、`tests/tutorial-touchpad-browser.cjs`（実操作・図の時系列検証）。調査に使用した各版はバックアップ内の`history-evidence/`にも保存した。

| 項目 | 旧版 / TASK D | TASK E | TASK E.1 |
| --- | --- | --- | --- |
| 教える順番 | EVADE → FREEZE → DRAW → EXECUTEの4ページ、その後実習 | Pico・STOP・LINE・TARGET・回避・実行・WAVEの7段階 | 旧版へ復元 |
| 説明図 | マウス / MOVE PAD、押す・描く・離す・実行をループ表示 | Picoの導入説明と実習カード | 旧図の経路・配置・タイミングを維持し、画像だけ現行Pico / 敵へ |
| 実習開始 | Pico `(160,430)`、移動64pxでTIME STOP案内 | 新しい段階別の条件 | 旧版へ復元 |
| TARGET | AIM 2体 `(430,210)` / `(690,360)`、移動・射撃を抑止 | 3種の敵、3 TARGET | 旧配置・個数、現行AIMの機械敵画像 |
| 弾 | `(300,105)`を左へ24px/s、`(790,510)`を右へ20px/s | 回避課題と危険ルートの追加条件 | 旧配置・速度を維持、現行の危険色 |
| 安全性 | 練習の安全猶予999秒、手動実行時に弾を除去 | 実衝突を伴う課題、安全ルートでのみ実行 | 旧練習の扱いへ復元。本編には適用しない |
| TIME STOP | 5秒。時間切れ時の処理も通常シミュレーションを使用 | 練習だけ無制限 | 5秒へ復元 |
| 実行 | 2 TARGETを一筆書き、SPACE。部分実行は再練習 | 回避課題達成と3 TARGETを条件とする | 旧版へ復元 |
| 完了 | 全撃破で完了、1.05秒表示後に本編へ | 完了ボタンからGARDENへ | **1.05秒のテンポを維持し、指定どおりWORLD MAPへ** |

旧説明の見出し `MOVE AND AVOID ENEMY FIRE.` / `STOP THE ENTIRE WORLD.` / `DRAW THROUGH THE ENEMIES.` / `EXECUTE THE DRAWN ROUTE.`、BACK / NEXTの進行を維持した。自機をPico、線をPicoの黄金の光跡、目標の輪をシアンと表記した。練習背景は現行GARDENのBEFORE。画像・効果音・ライブラリの新規導入はない。

`game.js`と`renderer.js`はTASK Dの実ファイルから復元したうえで、初回選択・再受講・WORLD MAPへの帰還だけを適合した。`tests/fixtures/tutorial-legacy.json`はTASK DのGit blobから抽出した7関数のSHA-256と配置・時間の記録で、現在の実装との一致を自動検証する。`renderer.js`はTASK Dと同一。

## 導線と保存

初回は `TITLE → START → FIRST FLIGHT`。黄金色の主ボタン`TRAINING START`と、枠線の副ボタン`SKIP → WORLD MAP`を表示する。TRAININGを選ぶと旧4ページ説明、実習、約1秒の完了表示、WORLD MAPへ進む。そこから`ENTER GARDEN`で本編を始める。

再受講はWORLD MAPの54px高のTRAININGボタン、またはタイトルのHOW TO PLAYから可能。地区を復旧したあともTRAININGを隠さない。受講中だけ独立したWorldとJourneyを使用し、完了・中断時に退避した本編オブジェクトを戻す。練習のスコア750点は本編へ加算しない。練習中のRと「最初から」は実習を再開し、WORLD MAPボタンは実習を中断する。

既存の初回管理キーはなかったため、`deadline.tutorial.v1`の1項目だけ追加した。値は`started` / `skipped` / `completed`。いずれかを記憶すると次のSTARTはWORLD MAPへ進む。完了済み状態は再受講で格下げしない。保存が拒否される環境では、そのページを開いている間だけ選択を保持する。保存拒否時のリロード後には再表示されるが、SKIPで遊べる。音量・タッチ感度の既存保存キーと本編の進行管理は変更しない。

## 変更範囲と検証

本番変更: `game.js`、`index.html`、`renderer.js`、`tutorial.js`、`tutorial.css`。
記録: `README.md`、`TASK_E1.md`。
検証: 旧チュートリアルのテストを復元・適合し、初回選択・保存拒否・再受講時の本編保存を追加。既存本編テストはFIRST FLIGHTとWORLD MAPの実ボタンを操作して戦闘に入るよう導線だけ更新した。

`config.js`、`simulation.js`、`character-assets.js`、`battle-art.js`、`stage-art.js`、`journey.js`、`world-map.js` / `world-map.css`、既存の背景・キャラクター画像はTASK Eから差分なし。10 WAVE / 5 AREA / LIGHT RESTORED / BEFORE・AFTER / SYNC / ENDING / SCORE / LIFE / 敵AI / 弾幕 / 当たり判定は維持する。

2026-09-06、Google Chrome **152.0.7977.82**（headlessでマウス・キー・タッチ相当入力）で検証した。

- Node **75 / 75 PASS**（本編67件＋旧実装・初回選択8件）。
- Chrome **14 / 14スクリプト PASS**。`browser.cjs`、`route-visual-browser.cjs`、`execute-feedback-browser.cjs`、`final-polish-mobile-browser.cjs`、`pico-browser.cjs`、`battle-visual-browser.cjs`、`barrage-browser.cjs`、`world-map-browser.cjs`、`restoration-browser.cjs`、`stage-performance-browser.cjs`、`title-browser.cjs`、`tutorial-touchpad-browser.cjs`、`astra-browser.cjs`、`pico-tutorial-browser.cjs`。
- 指定経路 `TITLE → START → FIRST FLIGHT → TRAINING → 完了 → WORLD MAP → GARDEN`、初回SKIP経路、WORLD MAPとHOW TO PLAYからの再受講、キャンセル・再練習・中断を確認。
- 初回選択のリロード保持、保存拒否時の同一ページ内保持、Enter / Space / Tabでの選択を確認。
- 旧説明4ページの移動・凍結・順番ロック・実行／撃破タイミング、PC2回の完走、縦／横のMOVE PAD完走、フィールドへの直接タッチ禁止、指を離したあとの描画継続を確認。
- 1920×1080 / 1280×720等のPC表示、320px幅までの配置、横向き、reduced motionを確認。スクリーンショットでPico、黄金LINE、シアンTARGET、現行敵、GARDEN BEFOREとボタンの優先順位を確認。
- GARDENの2 WAVEを実際にクリアした後にTRAININGを完了・中断し、元の**World全体とJourney全体が一致**。FORGEへ進めることも確認。
- 本編10 WAVE、5地区の正式BEFORE／AFTER、LIGHT RESTORED、SYNC、ENDING、敵弾・被弾・リトライ、音響・Canvas描画・負荷の既存試験もPASS。
- 通常操作のConsole error / pageerrorは0。画像読み込みを意図的に失敗させる既存試験は、期待した通信エラーだけを許容し、復帰・代替表示を検証している。
- 変更JavaScriptの構文確認と`git diff --check`はPASS。HTMLの実行参照17件はローカルで存在し、外部参照0。保護対象の本編ファイルと素材に差分なし。

初回のテストで2つの前提差を修正した。WORLD MAPの解禁アニメーション中に撮った時刻が変化するため、厳密一致の比較は既存アニメーションが落ち着いてから行う。音響試験の調整値は、練習から戻るだけでは既存Worldへ反映しないため、TITLEから新しい本編を作る実ボタン操作で適用する。どちらも本編コードの変更やアサーションの削除で解消していない。修正した2試験は再実行してPASS。

今回の集約結果は`tests/artifacts/tutorial-e1/regression/final-results.json`、スクリーンショットは`tests/artifacts/tutorial-e1/`、旧版の図と操作の確認画像は`tests/artifacts/tutorial-*.png`。これらは開発成果物としてGit対象外。物理スマートフォンでの操作・聴感は今回の確認対象外。

## 起動と復元（Windows）

PowerShellで以下を実行し、サーバーのウィンドウを開いたままにする。

```powershell
cd D:\Desktop\AIWorkSpace\01_projects\web\deadline
python -m http.server 4186 --bind 127.0.0.1
```

Chromeで `http://127.0.0.1:4186/` を開く。既に起動中なら再起動せず、ブラウザを再読み込みする。

版を切り替える前にはゲーム画面を閉じ、PowerShellで`git status`を確認する。未保存の変更が表示された場合は切り替えを中止し、その変更を保存してから続ける。`reset --hard`やファイル削除は不要。

TASK Eへ戻す:

```powershell
git switch codex/deadline-pico-tutorial
```

TASK E.1へ戻す:

```powershell
git switch codex/deadline-tutorial-restore
```

切り替え後はブラウザを再読み込みする。各版のcommitはbranchとバックアップbundleに保護されている。初回画面は同じブラウザの選択を記憶するため、初回STARTの表示を確認する場合はChromeのシークレットウィンドウで上のURLを開く。通常の再練習にはWORLD MAPのTRAININGボタンを使う。
