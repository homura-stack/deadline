# TASK G.2 — STARTは毎回TRAININGへ

## 確定した作業範囲

Git調査後のユーザー確認で、`69521cfb207585eaa7336c76664ad76869090dcc`型の現在のチュートリアルが正しいと確定した。内容の復元・作り直しは行わず、**START後の遷移だけ**を修正する。

- 使用branch: `codex/deadline-classic-training-experience`（調査時に作成した指定branch）
- 開始HEAD / parent: `396cd80cefb0b196a21d61a0fe981f43734e44a2`（TASK G.1）
- 開始時のstaged・unstaged・非ignored未追跡ファイル: なし。
- G.1 branch `codex/deadline-title-quality-first-training`を保持。全履歴を含む `<local-backup-path>/deadline-task-g1-complete-20260906-396cd80/deadline-g1.bundle` を検証済み。
- merge / push・ファイル削除は行わない。

## 旧遷移と新遷移

旧: 未受講ならSTART → TRAINING、`completed`ならSTART → WORLD MAP。

新: 保存状態を問わず **TITLE → START → TRAINING → 正常完了 → WORLD MAP → ENTER GARDEN**。

`game.js`の`startFromTitle()`から完了状態によるMAP直行分岐を外し、既存の`openTraining()`を常に呼ぶ。タイトルの退場アニメーション・入力ガードは維持した。ゲーム側の実行コードの差分は、この1関数だけ。

常設TRAININGボタンは引き続き同じ`openTraining()`を呼ぶ。`deadline.tutorial.v1`のキー・`completed`保存・読み込み・保存拒否時のセッション内保持はすべて維持し、STARTの遷移判定からだけ切り離した。既存の途中退出先（未完了ならTITLE、完了済みなら手動でWORLD MAPへ退出）も変更していない。

## 維持したもの

`69521cf`型の説明4ページ、移動64px、時間停止5秒、固定2 TARGET、LINE練習、EXECUTE、完了演出1.05秒を変更していない。G.1の`game.js`と比較し、`startFromTitle()`を除いたファイル全体が一致することを確認した。

`tutorial.js`、`index.html`、`tutorial.css`、`config.js`、`renderer.js`、`character-assets.js`、`journey.js`、`world-map.js`、`stage-art.js`、`title-pico.css`、`title-screen.js`も基準版と同一。タイトル背景・UI、正式Pico・サイズ・anchor、WORLD MAP、本編、正式背景10枚、LIGHT RESTORED、SYNC、ENDING、保存処理は変更していない。

## 検証方法

修正前に、既存Chrome受け入れテストを新仕様へ合わせてケースBを実行し、完了済みSTARTがTRAININGへ入らず失敗することを再現した。修正後は次を実操作で確認した。

- A: 保存状態のない隔離ChromeでTITLE → START → TRAINING → 正常完了 → MAP。
- B: 正常完了を保存した状態でもTITLE → START → TRAINING → 正常完了 → MAP。TITLEへ戻った場合と、ページをリロードした場合の両方。
- C: 常設TRAINING → 同じ4ページ・実習 → 正常完了 → MAP。
- TRAINING中はMAPが表示されないこと、旧started / skippedの保存状態でもSTARTはTRAININGになること、完了保存が保持されること。
- 必須Route A〜E: TRAININGから完了→MAP→GARDEN、完了済みSTARTからも実習完了→MAP→GARDEN、HOW TO PLAY / SETTINGS / CREDITSからTITLEへ戻る。

Nodeの旧版一致テストも継続する。本編用の既存Chromeテストは、受講済みの隔離プロファイルでSTART → TRAININGに入った後、既存の「WORLD MAPへ」を手動操作して本編へ進むようヘルパーを修正した。STARTの受け入れテストではこのヘルパーを使わず、実際のMOVE・STOP・2 TARGET・EXECUTEを最後まで操作する。製品へのテスト用バイパスは追加していない。

ログ・比較結果はGit対象外の`tests/artifacts/task-g2/`。ユーザーの実ブラウザの保存データは初期化しない。

## 検証結果（2026-09-06）

- ケースA / B / C: **すべてPASS**。特に完了済みのBもTRAININGの説明ページ0から始まり、実習を正常完了してからMAPへ進む。ページ再読込後も同じ。`report.json` / `start-cases.log`。
- Node: **75 / 75 PASS**。Git由来の練習配置・時間・7関数の一致を含む。`node.log`。
- Chrome **152.0.7977.82**（headless、実際のマウス・キー入力を自動操作）: **既存17スクリプトすべてPASS**。修正後の再試行なし。
- 必須Route A〜E、GARDEN開始、10 WAVE・5地区復旧・SYNC・ENDING・リスタート、リサイズ、タッチ相当入力、正式Pico、タイトル元画像のハッシュ・画質設定を確認。チュートリアルの内容・素材・描画は維持。
- 通常経路のConsole error / 画像ロードエラー: **0**。既存の画像取得失敗テストは別の意図的な障害fixtureとして復帰を検証した。
- `startFromTitle()`以外の`game.js`全体、および保存処理・HTML / CSS・Pico・MAP・描画の対象ファイルがG.1と同一。`scope-audit.txt`。`node --check game.js` / `git diff --check`: PASS。

Chromeの実行対象は`title-quality-training-browser`、`title-routes-browser`、`tutorial-entry-browser`、`pico-tutorial-browser`、`title-browser`、`tutorial-touchpad-browser`、`astra-browser`、`world-map-browser`、`pico-browser`、`battle-visual-browser`、`route-visual-browser`、`execute-feedback-browser`、`barrage-browser`、`final-polish-mobile-browser`、`stage-performance-browser`、`restoration-browser`、`browser`。各ログは上記artifactフォルダー内。タッチ相当の確認はChromeエミュレーションであり、物理端末の検証ではない。

## 変更ファイル

- `game.js`: STARTから既存TRAININGへの接続のみ。
- `tests/title-quality-training-browser.cjs`: ケースA〜C、再読込後の完了済みSTARTを実操作で検証。
- `tests/title-routes-browser.cjs`: 必須Route BもTRAINING完了を経由。
- `tests/tutorial-entry-browser.cjs`: 保存状態を問わずSTARTでTRAININGへ入ることを検証。
- `tests/pico-tutorial-browser.cjs`: 再読込・保存拒否時のSTARTを新遷移に合わせる。
- `tests/journey-helpers.cjs`: 本編用fixtureで既存の手動退出を操作。
- `tests/tutorial.test.cjs`: 既存保存テストの名前のみ更新。検証条件は維持。
- `README.md` / `TASK_G2.md`: 現在の遷移・変更範囲・検証記録。

## 確認と復元

確認URL: `http://127.0.0.1:4186/`。起動中のページはCtrl+F5で更新する。受講済みブラウザでもSTARTはTRAININGへ入る。

branchを切り替える前に`git status`で未保存の変更がないことを確認する。G.1へ戻すには`git switch codex/deadline-title-quality-first-training`、今回の版へ戻すには`git switch codex/deadline-classic-training-experience`。切替後はCtrl+F5で更新する。これらはmergeやpushではない。
