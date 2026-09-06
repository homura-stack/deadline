# TASK G.1 — タイトル原寸品質と初回TRAINING必須化

## 安全な基準

- 作業開始branch: `codex/deadline-title-pico`
- 開始HEAD / この変更のparent: `56a1376acbc8bd88a0695cf6be2ede72d956c9d4`（TASK G）
- 開始時のstaged・unstaged・非ignored未追跡ファイル: すべてなし。
- 作業branch: `codex/deadline-title-quality-first-training`
- TASK Gのbranchを保持し、完全履歴・23参照を含む `D:/Desktop/AIWorkSpace/backups/deadline-task-g-complete-20260906/deadline-g.bundle` の検証に成功した。
- origin: `https://github.com/homura-stack/deadline.git`。merge / push・既存ファイルの削除はしない。

## 画質低下の原因と修正

TASK Gの画像は、そのとき提供されたクリップボード添付の1024×572 JPEGだった。再圧縮はされておらず、その添付と同じ124,476 bytes、SHA-256 `a41694b88af44d79f420ec0f3a9c8a8db5a7418938744e3bd399fd0e2a20e839`。

実Chromeの1920×1080、deviceScaleFactor 1では、この画像を1920×1072.5 CSS pxへ**1.875倍に拡大**していた。`IMG`要素で、`object-fit: contain`、`object-position: 50% 50%`。`image-rendering: auto`、`transform: none`、`filter: none`、`opacity: 1`で、親要素にもblur・変形・透過はなかった。CSS背景は使用していないため`background-size: auto`、`background-position: 0% 0%`は画像の倍率に無関係。Canvasへの再描画や画像上のoverlayもない。主因は低解像度の添付を拡大していたこと。

今回指定された **`D:/Desktop/DEADLINE/タイトル.jpeg` は2752×1536、2,304,414 bytes**。`assets/title/pico-dead-circuit-original.jpeg`へ元バイトのままコピーし、参照を変更した。元・コピー双方のSHA-256は `db3cae82f0fde61644714aa92e2cadef661407e8d58acd40f0a99f15fc4df592`。JPEG再圧縮、WebP変換、再生成、描き直しは行っていない。旧 `assets/title/pico-dead-circuit.jpg` も保持している。

表示は引き続きHTMLの`<img>`＋`object-fit: contain`。intrinsic width/heightとCSSの縦横比を原寸へ揃え、画面全体に収める。CSS表示サイズの上限を2752×1536に設定し、それを超える大画面で不要に拡大しない。画像内のPico・ロゴ・コピーとボタンの配置関係は維持した。

| Chrome viewport / DPR 1 | 画像のCSS表示サイズ | 元画像に対する倍率 |
| --- | --- | --- |
| 1920×1080 | 1920×約1071.63 | 約0.698倍 |
| 2560×1440 | 2560×約1428.83 | 約0.930倍 |
| 1366×768 | 1366×約762.41 | 約0.496倍 |
| 3840×2160 | 2752×1536 | 1倍・中央配置 |

1920×1080の修正前後のスクリーンショットを目視比較し、文字、Picoの輪郭・羽・フェイスパネル、回路の拡大ぼけの改善を確認した。元素材に含まれる遠景のぼけや発光はそのまま保持する。物理画素数がCSS viewportを上回る高DPI画面で、元素材以上の解像度を新たに生成する処理は追加していない。

## 初回STARTと保存

従来の`shouldOffer()`は状態が`null`のときだけ初回選択を出し、`started` / `skipped` / `completed`のいずれもMAPへ直接進めていた。G.1のユーザー指定に従い、G / F.1の任意選択仕様を変更した。

- **未完了:** TITLE → START → 既存TRAININGへ直接入る。4ページ説明・実習を正常完了するとMAPへ進む。
- **完了済み:** TITLE → START → MAP。
- **常設TRAINING:** 保存状態に関係なく直接入れる。タイトル・HOW TO PLAY・MAPの入口を維持する。
- **途中退出:** 未完了なら「TITLEへ戻る」。説明または実習を抜けてもMAPへ進まず、次のSTARTで再度TRAININGへ入る。完了済みの再受講では従来どおりMAPへ戻る。

保存は既存の **localStorage `deadline.tutorial.v1`** のみ。`finishPractice()`で正常完了したときだけ`completed`を書き込む。STARTや退出では保存しない。旧`started` / `skipped`は読み取れるが完了とは見なさず、実習の正常完了時に同じキーへ`completed`を保存する。新しい永続キーは追加していない。保存が拒否された場合は既存のセッション内保持を使い、そのページ内では完了後にMAPへ直接進める。

任意のFIRST FLIGHT / SKIP選択画面と、その専用イベント・状態・CSSを取り除いた。説明ページ本体は維持している。ゲーム内にデータ全消去機能は存在しないため新設していない。R・TITLE・リロードによる本編や練習のやり直しは、完了状態を消去しない。ブラウザのサイトデータまたは既存キーを消去して再読込すると初回扱いになる。

## 変更境界

製品側の変更は`index.html`、`title-pico.css`、新タイトルJPEG、`tutorial.js`、`game.js`の入口・退出判定、廃止した選択画面専用の`tutorial.css`。チュートリアルの配置・説明・段階条件・練習時間・完了表示時間は変更していない。

`config.js`、`simulation.js`、`renderer.js`、`character-assets.js`、`journey.js`、`world-map.js`、`world-map.css`、`stage-art.js`、`styles.css`、`astra.css`、`audio.js`がTASK Gと同一であることを確認した。`index.html`のBRIEFINGから末尾までのDOMも同一。履歴基準の7関数に加え、`startPractice` / `finishPractice` / `reset` / `updateTutorial`もTASK Gと一致する。

正式Pico `assets/characters/pico-final.png` はSHA-256 `df2d8295764d489b79b41bd079e5b554f7f601138bdbc4bd436923ae059d3faf`のまま。描画幅48、anchor .56 / .47、当たり判定、本編10 WAVE・5 AREA・敵AI・弾幕・SCORE / LIFE・LIGHT RESTORED・SYNC・ENDING・正式背景10枚は変更していない。外部ランタイム依存の追加はない。

## 検証

修正前に、完了済み判定のNodeテスト3件が失敗し、Chromeで初回STARTが直接TRAININGへ入らないことも再現した。修正後のNodeテストは**75 / 75 PASS**。

G.1専用Chromeテスト `tests/title-quality-training-browser.cjs`:

- ケースA: 保存のない隔離ブラウザでSTART → TRAINING。説明・実習から途中退出しても未完了、リロードしても必須。実操作でMOVE → STOP → 2 TARGET → EXECUTE → 正常完了 → MAP。PASS。
- ケースB: 正常完了後のSTART → MAP。リロード後も同じ。PASS。
- ケースC: 常設TRAINING → 実操作で再完了 → MAP。MAPからの再受講・途中退出も維持。PASS。
- ケースD: 元JPEGのハッシュ・バイト数・naturalWidth/Height・4サイズの描画寸法・非拡大・filter / transform / opacityを検証し、スクリーンショットを確認。PASS。
- 旧started / skippedの各保存状態から実習を正常完了し、リロード後にMAPへ直接入れる。PASS。
- ブラウザの既存キー消去後に再読込するとTRAINING必須に戻る。PASS。

初回のテストはユーザーのブラウザデータに触れず、隔離したChromeプロファイルで行う。本編・描画の既存テストは受講済みのテスト用プロファイルへ揃えた。チュートリアルの完了を検証するテストでは、実操作を省略する代替処理を使わない。廃止された任意SKIPのテストは、新仕様の途中退出・初回必須化へ更新した。

結果と画像はGit対象外の `tests/artifacts/task-g1/`、主要ルートと10画面サイズは`tests/artifacts/title-routes/`に保存する。Playwrightは開発時のChrome検証専用であり、ゲームから読み込まない。

ローカルのChrome **152.0.7977.82**をheadlessで操作し、既存16本＋G.1専用1本の**計17本がPASS**。`title-routes-browser`、`tutorial-entry-browser`、`pico-tutorial-browser`、`title-browser`、`tutorial-touchpad-browser`、`astra-browser`、`world-map-browser`、`pico-browser`、`battle-visual-browser`、`route-visual-browser`、`execute-feedback-browser`、`barrage-browser`、`final-polish-mobile-browser`、`stage-performance-browser`、`restoration-browser`、`browser`、`title-quality-training-browser`を実行した。

必須Route A〜E（TRAINING完了→MAP→GARDEN、受講済みSTART→MAP→GARDEN、HOW TO PLAY / SETTINGS / CREDITSからTITLEへ戻る）、初回START→実習完了→GARDEN、10 WAVE・5地区復旧・SYNC・ENDING・リスタートがPASS。正式Pico、画像ロード、Console error、レスポンシブ、保存拒否時、タッチ相当入力も確認した。通常経路のConsole / 画像ロードエラーは0。画像取得失敗を意図的に起こす別ケースでは、取得失敗を期待値として復帰操作を検証している。タッチ検証はChromeのエミュレーションであり、物理スマートフォンの確認ではない。

総合`browser.cjs`の初回実行では自動操作側の探索が`No safe approach to a Wave enemy`で停止した。別の`restoration-browser.cjs`は同じ探索処理で10 WAVE完走済みで、戦闘処理にも差分はない。初回ログを残し、**コード変更なしで総合テストだけを単独再実行してPASS**した（`browser.log` / `browser-retry.log`）。その他の通過済みテストは再実行していない。`git diff --check`もPASS。

## 起動・復元

確認URL: `http://127.0.0.1:4186/`。起動済みページはCtrl+F5で更新する。

Windowsで再起動するときはPowerShellで以下を実行し、サーバーのウィンドウを開いたままにする。

```powershell
Set-Location 'D:\Desktop\AIWorkSpace\01_projects\web\deadline'
python -m http.server 4186 --bind 127.0.0.1
```

TASK Gの状態を開くには、未保存変更がないことを`git status`で確認してから`git switch codex/deadline-title-pico`。G.1へ戻るには`git switch codex/deadline-title-quality-first-training`。切替後はブラウザでCtrl+F5。これらはbranchを切り替える操作で、merge / pushではない。後から変更を加えた場合は、その変更を保存してから切り替える。
