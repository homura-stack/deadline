# TASK G — 正式Pico背景によるタイトル画面刷新

## 安全な基準

- 開始branch: `codex/deadline-training-recovery`
- 開始HEAD / parent: `4aec89221454889a307e69d9927f58fe004db82e`（TASK F.1）
- 開始時のstaged / unstaged / 非ignored未追跡ファイル: すべてなし。
- 保護branch: `backup/deadline-f1-before-title-20260906`
- 作業branch: `codex/deadline-title-pico`
- origin: `https://github.com/homura-stack/deadline.git`。merge / pushは行わない。

変更前に全22参照と完全な履歴を含む `<local-backup-path>/deadline-pre-task-g-20260906/deadline-f1.bundle` を作成し、`git bundle verify`に成功した。F.1のbranchは動かさず、専用branchで作業する。既存ファイル・素材の削除や履歴書換えはない。

## 正式素材と配置

ユーザー指定のJPEGを `assets/title/pico-dead-circuit.jpg` へ無加工でコピーした。1024×572、124,476 bytes、SHA-256は`a41694b88af44d79f420ec0f3a9c8a8db5a7418938744e3bd399fd0e2a20e839`。元添付とのバイト一致を確認する。[素材記録](assets/title/README.md)。

画像にロゴ、日本語コピー、LIGHT THE DEAD CIRCUIT.、SMALL LIGHT. BIG CONNECTIONS.が既に存在するため、HTMLで同じ文字を視覚的に重ねない。スクリーンリーダー用の見出し・説明は残す。画像が取得できなかった場合だけHTMLのタイトル名を表示し、ボタンは引き続き使える。

PCでは画像の比率を維持して全構図を画面内に収め、暗い左下にSTART、TRAINING、HOW TO PLAY、SETTINGS、CREDITSの順でHTMLボタンを配置する。主操作は黄白色〜黄金、練習は黄金の枠、補助情報は低彩度のシアン。Pico・光跡・画像のロゴをメニューで覆わない。画面全体のカード化やHUD情報の追加はしない。

狭い画面では画像の下に操作を分け、4:3付近ではメニューの高さを確保できる画像寸法にする。高さの低い横画面では主ボタンを横並びにする。設定・説明・クレジットは必要なときだけ表示する左側のパネルで、スマートフォン幅ではメニュー下へ配置する。通常時のPicoを覆う大きなパネルや過剰なズーム・点滅・パーティクルは追加しない。hoverは柔らかな黄金色の発光のみ。reduced motion時はtransitionを無効にする。

## 機能と変更境界

`game.js`はF.1と完全に同じ。START、TRAINING、保存状態、既存パネル切替のID・リスナーを維持し、新しい`title-screen.js`は補助パネルの「戻る」・Escape、狭い画面のパネル表示位置、背景取得失敗時の表示だけを担当する。既存メニューのクリック処理を呼ぶため、別のゲーム画面状態を導入しない。

| 操作 | 維持する挙動 |
| --- | --- |
| START | 選択保存済みなら直接WORLD MAP。未保存ならF.1の任意FIRST FLIGHTを維持し、SKIPでMAPへ進める。TRAININGを強制しない |
| TRAINING | タイトルの常設主ボタンから直接E.1の4ページ説明と2 TARGET実習へ。完了後WORLD MAP、そこからGARDEN |
| HOW TO PLAY | 操作方法を読むパネル。常設TRAININGとは独立し、既存の練習リンクも保持 |
| SETTINGS | MASTER / SFX / MUTE / タッチ感度と保存を維持 |
| CREDITS | 既存クレジットの内容を保持 |
| 補助パネルから戻る | 新しい「戻る」ボタン、Escape、同じメニューボタンの再押下で閉じる |

`index.html`のFIRST FLIGHT以降（説明・実習・WORLD MAP・戦闘・復旧・ENDINGのDOM）はF.1と一致する。`config.js` / `simulation.js` / `renderer.js` / `tutorial.js` / `tutorial.css` / `character-assets.js` / `world-map.js` / `world-map.css` / `journey.js` / `stage-art.js` / `battle-art.js` / `audio.js` / `styles.css` / `astra.css`は変更しない。

正式Pico `assets/characters/pico-final.png` のSHA-256は`df2d8295764d489b79b41bd079e5b554f7f601138bdbc4bd436923ae059d3faf`、論理幅48、anchor `(.56,.47)`、当たり判定も維持する。10枚の戦闘背景、敵素材、LINE、TARGET、TIME STOP、EXECUTE、AI、弾幕、SCORE / LIFE、10 WAVE、5 AREA、LIGHT RESTORED、SYNC、ENDINGは変更しない。

旧Canvas図の`title-art.js`はファイルを残し、HTMLからの読み込みだけ外す。外部ライブラリ、CDN、外部フォント、実行依存は追加しない。

## 必須回帰テスト

今後の毎TASKで`node tests/title-routes-browser.cjs`を実行することをREADMEに明記した。A〜Eの実操作、正式Pico、TRAINING常設、STARTの保存済み・初回分岐、パネルからの帰還、エラー、10種の連続リサイズを検証する。ルートAは完了状態を注入せず、実際の移動・TIME STOP・ドラッグ・SPACEで完走する。

`tests/title-helpers.cjs`は添付画像上のロゴ・Pico・光跡・補助コピーの座標を使い、主要メニューとの非重複と画像全体の表示を確認する。旧`title-browser.cjs`と`browser.cjs`のタイトル検証も、この画像の読込・比率・構図検証へ適合する。本編アサーションやチュートリアルの条件は変更しない。

## 検証結果

2026-09-06、Chrome **152.0.7977.82**を使用。headlessで実際のマウス・キー・タッチ相当入力を送って確認した。

- **Node 75 / 75 PASS**。F.1の旧チュートリアル契約、本編のTIME STOP・衝突・弾幕・WAVE・AREAを含む。
- **Chrome 16 / 16スクリプト PASS**。新規`title-routes-browser.cjs`と、既存`title-browser.cjs` / `tutorial-entry-browser.cjs` / `pico-tutorial-browser.cjs` / `tutorial-touchpad-browser.cjs` / `astra-browser.cjs` / `world-map-browser.cjs` / `pico-browser.cjs` / `battle-visual-browser.cjs` / `route-visual-browser.cjs` / `execute-feedback-browser.cjs` / `barrage-browser.cjs` / `final-polish-mobile-browser.cjs` / `stage-performance-browser.cjs` / `restoration-browser.cjs` / `browser.cjs`。
- **Route A**: TITLE → 常設TRAINING → 4ページ → Pico移動 → TIME STOP → 2 TARGETを描画 → EXECUTE → 完了 → MAP → GARDEN。
- **Route B**: 選択保存済みのTITLE → START → MAP → GARDEN。未保存は従来のFIRST FLIGHTを表示し、SKIP → MAP → GARDENも成功。強制TRAININGなし。
- **Route C / D / E**: HOW TO PLAY / SETTINGS / CREDITSを開き、戻るボタン・Escape・従来の同じメニュー再押下でTITLEへ。読み取り中のゲーム時間は停止。MASTER / SFX / MUTEの変更とリロード保持、既存のタッチ感度操作も成功。
- **レスポンシブ**: 1920×1080 / 2560×1440 / 1366×768 / 1280×720 / 2560×1080 / 1024×768 / 768×800 / 390×844 / 320×800 / 844×390を1ページで連続リサイズ。画像全体の比率、ロゴ・Pico・光跡と主要メニューの非重複、主ボタンの画面内配置、補助パネルの表示と帰還を確認。PC3指定サイズ、4:3、縦長の実スクリーンショットを目視確認した。
- 正式PicoのPNG・幅48・anchor `(.56,.47)`を照合。旧Picoと旧タイトルJSへのリクエスト0。正式タイトルJPEGは添付とSHA-256が一致。
- 本編の**10 WAVE → 5地区のLIGHT RESTORED → SYNC → ENDING → 再開始**、通常入力、被弾、リトライ、ONE STOP、黄金LINE、シアンTARGET、180弾、4倍CPU / DPR 2、file://を確認。
- 通常操作の**Console error / pageerror / 画像ロードエラー0**。意図的な取得失敗は隔離した負の試験で扱い、タイトルJPEG失敗時もHTML名とTRAININGが使える。既存Pico・ステージ画像の遅延・失敗時の試験も成功。
- `node --check`、`git diff --check`、保護対象の比較が成功。FIRST FLIGHT以降のDOMはF.1と一致。HTMLの実行参照17件はすべてローカルで存在し、重複ID 0、外部参照0。HTTP 4186のタイトルHTML・CSS・JS・JPEGが作業ファイルとバイト一致し、200を返す。

検証中に2点を扱った。4:3でメニューがはみ出すケースは、画像の表示寸法で操作領域を確保して修正した。補助パネルのスクロール位置が端数ピクセルだけ下端へ出るケースは、スクロール余白を加えて解消した。どちらも最終の10サイズ試験とタイトル試験を再実行して成功。

総合`browser.cjs`の初回は自動入力用`planWave`が「No safe approach to a Wave enemy」で停止した。同じヘルパーを使う別の10 WAVE復旧試験は成功しており、ゲームコードと経路探索コードは変更せず、総合試験を単独で再実行して全項目が成功した。初回ログも削除せず`tests/artifacts/task-g/browser.cjs.log`に保持。最終ログは`browser-final.log`。

集約結果・監査・ログは`tests/artifacts/task-g/`、必須A〜Eの結果と10サイズの画像は`tests/artifacts/title-routes/`。これらは開発成果物としてGit対象外。物理スマートフォンでの操作・聴感は未検証。

## 変更ファイル

- 実装: `index.html`、`title-pico.css`、`title-screen.js`
- 正式素材: `assets/title/pico-dead-circuit.jpg`
- 記録: `README.md`、`TASK_G.md`、`assets/title/README.md`
- 新規検証: `tests/title-routes-browser.cjs`、`tests/title-helpers.cjs`
- 既存タイトル検証の適合: `tests/title-browser.cjs`、`tests/browser.cjs`

## 起動・復元

サーバー起動中ならChromeで `http://127.0.0.1:4186/` をCtrl+F5で再読み込みする。未起動ならPowerShellで以下を実行し、ウィンドウを開いたままにする。

```powershell
cd .
python -m http.server 4186 --bind 127.0.0.1
```

版を切り替える場合はゲームを閉じ、`git status`で未保存変更がないことを確認する。変更があれば保存してから切り替える。

```powershell
# 元の正常版 TASK F.1
git switch codex/deadline-training-recovery
# 新タイトル版 TASK G
git switch codex/deadline-title-pico
```

切り替え後にブラウザを再読み込みする。`reset --hard`や削除は不要。WORLD MAP刷新や次TASKには進めない。
