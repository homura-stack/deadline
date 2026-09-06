# DEAD/LINE TASK E — Pico対応チュートリアル

実施日：2026-09-06。TASK Eのみ。TASK F、merge、pushは実施しません。

## 安全な基準点

| 項目 | 確認内容 |
| --- | --- |
| 作業開始branch | `codex/deadline-light-restoration` |
| TASK D / parent SHA | `ce742ca5af0a7e2277fefb527e52d7ce5781185a` |
| 作業開始status | clean。staged / unstaged / 非ignore未追跡なし |
| 保護branch | `backup/deadline-task-d-before-e-20260906` |
| TASK E branch | `codex/deadline-pico-tutorial` |
| origin | `https://github.com/homura-stack/deadline.git`（通信・pushなし） |

コード変更前に `D:\Desktop\AIWorkSpace\backups\deadline-pre-task-e-20260906` へ全履歴の `deadline-before-task-e.bundle` と、ignore対象を含む248ファイルの `working-files-before-e.zip` を保存。Git bundle verify、ZIP件数・CRCを検証済み。TASK Dとそれ以前のbranchを保持しています。ファイル削除はありません。

## 実習

旧4ページの幾何学的なBRIEFINGを、現行Pico素材の短い入口と実操作のFIRST FLIGHTへ置換しました。

1. **PICO** — 黄金色の自機を実際に動かす。
2. **TIME STOP** — SPACE / TIME STOPで停止。敵・弾・世界時刻が止まる。
3. **LINE** — 少しドラッグしてPico自身の黄金の光跡を描く。
4. **TARGET** — シアンの輪へLINEを通してロックする。
5. **DANGER** — ボタンで回避実習へ。位置とLINEをリセットして時間を戻し、敵を回り込んで黄金の輪へ移動。その後もう一度TIME STOPし、弾の列を迂回しながら3つのTARGETをつなぐ。
6. **EXECUTE** — 安全な3 TARGETルートだけ実行可能。SPACE / EXECUTEでPicoが実際のLINEを飛び、3体を撃破する。
7. **WAVE CLEAR** — 2 WAVEごとにAREAを復旧することを伝える。プレイヤーが「GARDEN / WAVE 1へ」を押すまで表示し、本番の新規WAVE 1へ移る。

開始経路はタイトルの **HOW TO PLAY → Picoと操作を練習する**、または初期WORLD MAPの **操作を練習する**。途中のTITLE / R / 最初から、終了後の再受講にも対応。入口の「練習せずGARDENへ」は受講完了扱いにしません。通常のSTART → WORLD MAPは維持しています。

## 保持するゲーム仕様

`tutorial.js`に練習用の独立したWorld、教材配置と進行条件をまとめ、`game.js`から通常のMOVE / STOP / LINE / EXECUTE処理へ接続します。`simulation.js`、`config.js`、敵AI、弾幕、当たり判定、得点、LIFE、通常の制限時間・難易度・10 WAVEは変更していません。

練習だけSTOPのカウントダウンを保留し、UIにも「練習は時間無制限 / 本番は制限時間あり」と表示。敵接触は既存の線分衝突で判定します。失敗すると練習区間から再試行できます。EXECUTE前の敵弾消去は行わず、実際に安全なLINEを描く必要があります。UNDO / CLEARで条件を失うと実行可能状態も解除します。

Pico・敵3種は既存PNGと現行Rendererのキャッシュをそのまま利用。黄金のLINE、シアンTARGET、赤・ピンク・紫の危険色も既存描画を使用。正式背景10枚、LIGHT RESTORED、マップ、同期発光、エンディングは変更していません。新規画像・外部ライブラリ・外部ランタイムはありません。

## 変更ファイル

- 画面・実習：`index.html`、`game.js`、`renderer.js`、新規`tutorial.js`、新規`tutorial.css`
- 文書：`README.md`、新規`TASK_E.md`
- 新規検証：`tests/tutorial.test.cjs`、`tests/tutorial-helpers.cjs`、`tests/pico-tutorial-browser.cjs`
- 既存検証の新実習への対応：`tests/tutorial-touchpad-browser.cjs`、`tests/astra-browser.cjs`、`tests/title-browser.cjs`、`tests/browser.cjs`、`tests/final-polish-mobile-browser.cjs`、`tests/pico-browser.cjs`

旧4ページの図形・2体の練習ルート・自動終了を前提とする検証を、新しい実習と3体の敵へ更新しました。通常戦闘の検証は維持しています。画像読込失敗テストは、入口のPicoとゲーム内Picoが同じ画像を個別に再要求する場合を区別し、4種類の素材すべての失敗とfallbackを検証します。

## 検証結果

- Node：既存67件＋実習8件、計75件PASS。通常のTIME STOP、衝突、弾幕、得点、10 WAVE、5地区進行を維持。
- Chrome 152.0.7977.82：14本のブラウザ検証スクリプトがPASS。結果はローカルの`tests/artifacts/tutorial-e/final-tests.json`。
- 新実習のPC通し操作を2回確認。移動せずSPACE、未ロック、危険ルート、UNDO後の実行を拒否。実際の敵接触から再試行し、安全な3 TARGETルートをSPACEで走破。完了→通常GARDENでWAVE 1 / SCORE 0 / LIFE 1 / 被弾0へ移ることを確認。
- MOVE PADの縦390×844・横844×390・動きを減らす設定で完走。フィールドへの直接タッチが移動・描画・UNDOを起こさないこと、感度設定保存、精密操作、指を離してからのLINE継続も確認。
- 1920×1080、1280×720、768px、390px、360px、320px、横844×390の表示確認。小さいPCウィンドウのLIFE・TARGET表示がHUD内に収まることも確認。
- 通常ゲームを10 WAVE完走。ONE STOP、WAVE 7リトライ、5地区の正式背景と復旧、同期発光、エンディング、TITLE / RESTART / リロードが動作。
- 復旧演出1515フレームの監査でゲームWorld変更0、戦闘エフェクト残留0。180弾の描画負荷試験とDPR 2・CPU 4倍スローダウン試験もPASS。
- 通常のConsole error / 未捕捉例外 / 外部リソース要求は0。意図的な画像失敗・遅延試験は別枠でfallback / retryを検証。`file://`起動も検証済み。
- JavaScript構文検査、`git diff --check`合格。TASK Dのシミュレーション・設定・素材・ステージ・マップ関連ファイルには差分なし。

ブラウザ操作は実ChromeをPlaywrightで駆動した検証です。タッチはエミュレーションで、実機スマートフォンでの確認とは区別しています。検証画像とJSONはGitのignore対象ですが、完了時の安全バックアップにもコピーします。

## 起動

Windowsのターミナル（PowerShell）で：

```powershell
cd D:\Desktop\AIWorkSpace\01_projects\web\deadline
python -m http.server 4186 --bind 127.0.0.1
```

Chromeで <http://127.0.0.1:4186/> を開き、HOW TO PLAYから練習へ進みます。ターミナルを閉じるとサーバーも終了するため、確認中は開いたままにしてください。更新が残る場合はCtrl+F5で再読込できます。

## TASK D / TASK Eの切り替え

プレイを閉じて、プロジェクトで `git status` を実行します。`nothing to commit, working tree clean` と表示されたら、次で切り替えられます。変更があるときは、その変更を消さずに作業を止めてください。

TASK Dへ：

```powershell
git switch codex/deadline-light-restoration
```

TASK Eへ：

```powershell
git switch codex/deadline-pico-tutorial
```

同じURLをCtrl+F5で読み直してください。branchを切り替えても他方の完成版commitは残ります。`reset --hard`、merge、pushは必要ありません。
