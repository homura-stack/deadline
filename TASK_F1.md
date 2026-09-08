# TASK F.1 — 保存済み状態でも見つかるTRAINING導線

## Git安全確認

- 開始branch: `codex/deadline-pico-final`
- 開始HEAD / TASK F: `06c1bf4cc53cf32a10e6b55bc4788ee15b7ad69e`
- その親 / TASK E.1: `3621a5e30d103447efb3625272b49d5ff84e341d`
- TASK E: `69bf3a2a96135df02ebd865b3abcd5c038014159`
- 開始時のstaged / unstaged / 非ignored未追跡ファイル: すべてなし。
- 保護branch: `backup/deadline-task-f-before-f1-20260906`
- 修正branch: `codex/deadline-training-recovery`
- origin: `https://github.com/homura-stack/deadline.git`。merge / pushなし。

作品変更前に `<local-backup-path>/deadline-task-f-complete-20260906-06c1bf4/deadline-f.bundle` を検証し、Fを含む19参照と完全な履歴が復元できることを確認した。Fのbranchと安全な基準点を残し、新branch上で修正。既存ファイル・画像の削除や履歴書換えは行わない。

## 原因とGit比較

ユーザーが報告した症状は「入口が見つからない／STARTで直接MAPへ進む」。チュートリアル本体の消失ではなく、初回選択の保存と入口の見つけにくさによるものだった。

| 比較 | 実際の差分 |
| --- | --- |
| TASK E → E.1（F開始直前） | Eの7段階・3 TARGETから、Git旧版の4ページ・2 TARGETの実習へ復元。FIRST FLIGHT、再受講、本編状態を保持したMAP帰還、初回選択の保存を追加 |
| E.1 → F完了後 | `game.js` / `tutorial.js` / `tutorial.css` / `config.js` / `renderer.js` / `simulation.js` / `journey.js`に差分なし。チュートリアルのDOM・イベント・操作条件・配置・完了条件・遷移は残っている |
| Fの画像関連差分 | `character-assets.js` / `index.html` / `world-map.js`で旧Picoから正式PNGへ参照切替。FIRST FLIGHTの画像寸法ヒントのみ調整。チュートリアルを無効にする処理はない |

E.1の`deadline.tutorial.v1`が`started` / `skipped` / `completed`なら、`shouldOffer()`はfalseとなり、次のSTARTはFIRST FLIGHTを省略してMAPへ進む。一方、タイトルの既存TRAININGボタンは、最初はhiddenのHOW TO PLAYパネル内にあった。この組み合わせをChromeで再現した。ユーザーのブラウザに保存されていた具体的な値までは取得していない。

修正前に以下も確認した。

- `http://127.0.0.1:4186/`のHTML・チュートリアル・ゲーム制御・素材参照・正式PNGの7ファイルが、作業中のF版とバイト単位で一致。HTTP 200。
- 初回はFIRST FLIGHT、保存済み3状態では直接MAPへ進む。全状態でMAPから4ページのチュートリアルを表示でき、新Picoの参照も正常。
- 既存のE.1通し試験とNode 75件は、作品コードを変更する前から成功した。

したがってFを巻き戻したり、チュートリアルを別実装へ置き換える修正は行わない。ユーザーがE.1で指定した「旧チュートリアルの遊び方」と、Fの正式Picoをそのまま利用する。

## 修正

- `index.html`: START直下に、常時見える`TRAINING / 操作を練習する`ボタンを追加。
- `game.js`: 新ボタンから既存の`openTraining`へ接続するイベントリスナーを1行追加。
- `tutorial.css`: 新ボタンの黄金色の枠と48px以上の高さを指定。高さの低い横画面ではSTARTと横並びにして収める。
- `tests/tutorial-entry-browser.cjs`: 保存済み状態でも、HOW TO PLAYを開かずタイトルから練習を開始・完走できる回帰試験を追加。修正前の失敗、修正後の成功を確認。
- `README.md` / 本記録: 入口と原因・検証・復元手順を記載。

チュートリアル本体を上書き復元する必要はなかった。4ページの説明、2 TARGETの配置、実操作、TIME STOPの5秒、完了表示、WORLD MAPへの帰還はE.1のまま。初回FIRST FLIGHT、HOW TO PLAY、WORLD MAPからの再受講も保持する。保存状態の消去・キー変更・毎回の強制案内は行わず、通常STARTは従来どおりMAPへ進める。

## 正式Picoと保護対象

- 正式PNG: `assets/characters/pico-final.png`
- SHA-256: `df2d8295764d489b79b41bd079e5b554f7f601138bdbc4bd436923ae059d3faf`
- 論理描画幅48、高さ約45、anchor `(.56, .47)`を維持。
- 画像・参照・offset・当たり判定はFから変更なし。旧画像も保持。
- LINE、敵、通常10 WAVE、5 AREA、WORLD MAP本体、LIGHT RESTORED、SYNC、ENDING、SCORE / LIFE、難易度のコード・素材は変更なし。

## 検証結果

2026-09-06、Chrome **152.0.7977.82**（headlessの実マウス・キーボード・タッチ相当入力）で確認。

- Node **75 / 75 PASS**。旧Git実装の7関数のハッシュ、練習配置とタイミング、本編の当たり判定・弾幕・WAVE・AREAを含む。
- Chrome **6スクリプト PASS**: 新規`tutorial-entry-browser.cjs`、既存`pico-tutorial-browser.cjs`、`tutorial-touchpad-browser.cjs`、`title-browser.cjs`、`world-map-browser.cjs`、`pico-browser.cjs`。
- 入口の回帰試験は、修正前に「HOW TO PLAYを開かずTRAININGが見える」のアサーションで失敗。追加後は未保存 / started / skipped / completedの全状態で成功。
- **TITLE → TRAINING → 4ページ → Pico移動 → TIME STOP → 2 TARGETのLINE → EXECUTE → 完了 → WORLD MAP → GARDEN**が成功。
- **TITLE → START → WORLD MAP**（選択保存済み）、初回START → FIRST FLIGHT → TRAINING / SKIP、HOW TO PLAY、MAPからの再受講、リロード、保存拒否、再練習・中断を確認。
- GARDENの実2 WAVE → LIGHT RESTORED → MAPでTRAININGを再受講・中断・完了した後も、本編WorldとJourney全体を保持。FORGEへ進行可能。
- 説明図4枚・実習Canvas・MAP・GARDENのPicoが正式素材。新規試験では旧`pico.png`の通信0、描画幅48・高さ・anchorをFの値と照合。
- 新ボタンを1920×1080 / 1280×720 / 768×800 / 390×844 / 320×800 / 844×390で表示・クリックし、画面内に収まることを確認。既存タイトル・説明図は7サイズ、reduced motion、縦横のMOVE PAD操作も成功。スクリーンショットでタイトル入口と実習の新Picoを確認。
- 通常操作のConsole error / pageerror / 画像ロードエラーは0。既存素材試験の意図的な画像取得失敗のみ、期待した通信エラーを分離して検証。遅延・取得失敗時の代替描画、DPR 2、file://も成功。
- `node --check`、`git diff --check`、保護対象の差分確認に成功。外部依存追加なし。

診断と今回の回帰試験は`tests/artifacts/task-f1/`、既存試験の画像は各テストの従来の出力先へ保存（Git対象外）。今回は入口だけの修正のため、後半10 WAVE全体とSYNC / ENDINGの通し試験は再実行していない。該当する本編コード・素材にはFからの差分がない。物理端末でのスマートフォン操作は未検証。

## 起動と復元

ローカルサーバーが起動中なら、Chromeで `http://127.0.0.1:4186/` をCtrl+F5で再読み込みする。START直下のTRAININGから練習へ入れる。公開URLへはpushしていない。

未起動の場合、PowerShellで次を実行し、ウィンドウを開いたままにする。

```powershell
cd .
python -m http.server 4186 --bind 127.0.0.1
```

版を切り替える前はゲームを閉じ、`git status`で未保存変更がないことを確認する。変更が表示された場合は保存してから切り替える。

```powershell
# 修正前TASK F（正式Picoはこの版にも存在）
git switch codex/deadline-pico-final
# TASK F.1
git switch codex/deadline-training-recovery
```

切り替えた後にブラウザを再読み込みする。`reset --hard`や削除は不要。
