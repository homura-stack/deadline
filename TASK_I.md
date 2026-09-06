# TASK I — UI / UX改善

## 安全な基準

- 作業前branch: `codex/deadline-world-map-final`
- 作業前HEAD / 今回のparent: `ed69094555d6b462b8e490e8feeab334f5eaa3f3`
- staged / unstaged / untracked: すべてなし。現在HEADにTASK H以降の追加commitはなかった。
- 作業branch: `codex/deadline-ui-ux-polish`
- 元branchを保持。merge / push / ファイル削除なし。

## 実装前の監査

変更前のChromeでTITLE → START → 説明4ページ → 実操作TRAINING → WORLD MAP → GARDENのWAVE 1–2 → LIGHT RESTORED → MAPを通した。
`tests/artifacts/task-i/before.cjs`、`before-*.png`、`before-metrics.json`に操作・画面・計測を保存。

|分類|情報|プレイヤーの判断 / 変更前の問題|
|---|---|---|
|最重要|TIME LEFT・ゲージ|描画を続けるか実行するか。16pxの数字、5pxの細いゲージで探しにくい|
|最重要|LIFE|次の被弾に耐えられるか。SCOREと同じ22pxの数字だけだった|
|最重要|TIME STOP / DRAW / EXECUTE|避ける・描く・実行を判断。18pxの状態と10pxの操作が遠く離れていた|
|最重要|TARGET・TARGET進捗|どこを通り、何体ロックしたか。序盤はLOCKの数字だけで総数が分からない|
|重要|AREA・WAVE|今いる地区と復旧までの位置。地区9px、WAVE番号38pxで不均衡|
|重要|現在の目的・操作ヒント|次にマウス・SPACEのどちらを使うか。約10–11px、実行指示がdisabled表示で薄かった|
|重要|MAPのAREA / LOCKED / RESTORED / CURRENT / 選択 / ENTER|行ける地区と次の進路。8–12px中心で状態が読みにくい|
|重要|TITLEメニュー|開始・練習・説明等を選ぶ。主要15/13px、補助11pxだった|
|重要|TRAININGの説明・現在ステップ・NEXT|操作を理解し進む。小さい和文・ボタン、実習中にステップ番号がない|
|重要（発生時は最重要）|GAME OVER・WAVE CLEAR・AREA CLEAR・LIGHT RESTORED|失敗・達成と次の行動。大見出しは既に明確だが補助文と操作が小さい|
|補助|SCORE・凡例・詳細|成果や忘れた操作の確認。SCOREはLIFEと競合、装飾英字が画面外周に多い|

## 実装

- `ui-polish.css`を最後に読み込み、各画面の情報階層を集約。全体の一律拡大やCanvas縮小をしない。
- TIME: 34–40pxの黄白色の数字、9pxのゲージ。通常は充電率、停止中は残り秒数。既存警告しきい値に連動して暖橙→危険色と「残りわずか」を併用。新しい停止・警告タイミングはない。
- LIFE: 27–30pxと黄金の光アイコン。0で消灯する。値・被弾処理は従来通り。
- TARGET: 全WAVEで `現在 / 総数`、シアン色、全ロックで `✓ COMPLETE`。通常時は残存TARGET数、クリア時は `CLEAR` を表示し、前回の停止時の総数を残さない。WAVE 7以降の全ロック必須条件はそのまま。早期WAVEへの新しい必須条件は設けない。
- PHASE: 状態と動作を左上へまとめ23–25px / 14–15px。TRAINING中は既存状態を読む `1 / 4`〜`4 / 4`を表示。
- WAVEを28px、SCOREを下部16pxへ整理。地区名13px、次の操作14px。停止中のPC実行は引き続きSPACEのみで、キー案内を暗くしない。
- 操作の再確認は外周の「操作を確認する」。ネイティブdetailsのキーボード操作を使う。開いてもCanvasの幅・高さを変えない。確認中も時間が進むことを明記。
- タイトル: 原寸品質・画像位置・メニュー位置は維持。START 21px、TRAINING 17px、補助メニュー14px。背景のPico・ロゴを覆わない。
- TRAINING: 説明4ページとデモ・説明内容は維持。和文18px、ステップ16px、ボタン16px、練習指示17pxを基本とし、小画面だけ再配置。768px幅は左右2列を保ち、650px以下で縦積みにする。
- MAP: 地区名18px、和名14px、状態12px、ENTER 17px。CURRENTと`aria-current="location"`は既存Pico位置を表示するだけ。LOCKEDは明るい文字、選択は下線も併用。短い画面は詳細をマップ下部へ移し、背景とノードの座標基準は維持。TRAININGボタンの高さは短いPC画面でも50px以上を維持。
- MAP実画面で、画像ロード済みでも最初の描画でBEFOREが単色に見えるケースを検出。写真・SVG・ノードの重なり順とBEFOREの同期デコードを明示。画像データ・マスク・復旧判定は無変更。独立したマスクfixtureだけでなく実ゲーム画面の画像ピクセルも検証する。
- リザルト: 見出しに従属する説明14–16px、RETRY等の主要ボタン16px。LIGHT RESTOREDは最大64pxの見出しと地区名16px。既存の表示時間・トランジションを維持。
- 縮小・非表示: SCOREの主張、過大なWAVE番号、画面端の装飾英字・重複凡例・MAPの小さな装飾コピー。ファイルや素材の削除はない。

## 保持したもの

正式Pico画像・描画サイズ48・anchor (.56,.47)、敵素材、全戦闘背景、タイトル素材、マップ原画像を保持。
`config.js`、`simulation.js`、`renderer.js`、`journey.js`、`tutorial.js`、`stage-art.js`、`character-assets.js`、`title-screen.js`に変更なし。
`game.js`の変更は`updateUi()`内のDOM表示だけ。START・受講済み状態・練習本体・操作条件・ゲーム進行を変更しない。
`world-map.js`の変更はBEFORE描画属性と現在地テキスト/アクセシビリティ属性だけ。地区再挑戦やPicoホバリングは実装していない。

## 検証と比較

検証記録は `tests/artifacts/task-i/`。Chrome実ブラウザをヘッドレスで入力操作した結果であり、実機の視距離やユーザー自身の操作感評価とは区別する。

|Viewport|維持するCanvas表示寸法|主な確認|
|---|---|---|
|1920×1080|1192×745|残り時間40px、LIFE/TARGET30px、従来のプレイ領域維持|
|2560×1440|1390×820|同じ階層・大きな背景内のUI位置|
|1366×768|約772.8×483|残り時間34px、LIFE/TARGET27px、MAP詳細を下部へ配置|

- 比較ビューア: `http://127.0.0.1:4186/tests/artifacts/task-i/compare.html`（ローカルサーバー起動中）。改修前／改修後を切り替えて表示。画像は加工せず保存。
- 比較: `before-title.png` / `after-title-1920.png`、`before-briefing.png` / `after-briefing-1920.png`、`before-stop-1.png` / `after-stop-1920.png`、`before-restored.png` / `after-restored-1920.png`。
- 新規 `tests/ui-polish-browser.cjs`: 3解像度で元の操作を通し、HUD優先順位、Canvas寸法、実MAP写真ピクセル、ラベル非重複、TARGET完了、TRAINING再受講、被弾→GAME OVER→RETRY、操作再確認を検証。
- 既存 `tests/browser.cjs`: 補助ラベルの期待値 `ACTIVE` を新しい表示文言「残り時間」に合わせた1箇所のみ変更。
- 最終Node: **79 / 79 PASS**。構文チェックと`git diff --check`もPASS。
- 新規UI検証: **3解像度すべてPASS**。TITLE → START → 説明4ページ → 練習完了 → MAP → Garden W1/W2 → LIGHT RESTORED → MAP、および常設TRAININGからの再受講 → Garden → 実際の敵弾への衝突 → GAME OVER → RETRYを入力操作で確認。Console error / request failureは0。
- 最終Chrome: **既存18スクリプト＋新規UIスクリプト、計19本PASS**。Chrome 152.0.7977.82。集計は`final-results.json`。初回と再確認を混同せず、各スクリプトの最終ログを参照する。通常経路のConsole error / 画像ロードエラーは0。
- `restoration-browser`: 10 WAVEを元の入力操作で通過し、5地区のBEFORE/AFTER、段階的復旧、SYNC、ENDING、再開始までPASS。意図的なロード遅延・取得失敗のfixtureも、通常のエラーなし経路と分けて検証。
- `stage-performance-browser`: 既存の戦闘／復旧Canvas描画テストPASS。4倍CPU制限・DPR 2でP95は戦闘5.5ms／復旧1.6ms。WORLD MAP専用の性能値ではない。
- 初回回帰で発見した768×800の説明ページの縦溢れと、短いPC画面のTRAININGボタンの高さ不足はCSSを修正して再確認PASS。タイトル／説明は7レイアウト、練習導線は6レイアウトで確認。
- 初回の`restoration-browser`はWAVE 9の自動ルート探索で停止した。ゲームや探索コードを変更せず単独のChromeプロセスで再実行し、10 WAVEを完走。同様に初回の`browser`はWAVE 7の部分ルート探索で停止したが、探索コードを変えない再実行で部分実行の失敗処理から10 WAVE完走・モバイル相当入力・静的ファイル起動までPASS。両方とも探索停止の根本原因までは確定していないため、安定性の保証とは区別する。初回失敗ログと再実行ログをともに保持。

## 切り替え方法

未保存の変更がないことを `git status` で確認してから、このフォルダーのPowerShellで実行する。

```powershell
git switch codex/deadline-world-map-final
# TASK Iへ戻す
git switch codex/deadline-ui-ux-polish
```

強制切り替えや `reset --hard` は不要。

対象Chrome: `title-quality-training-browser`, `title-routes-browser`, `world-map-browser`, `restoration-browser`, `tutorial-entry-browser`, `pico-tutorial-browser`, `title-browser`, `tutorial-touchpad-browser`, `astra-browser`, `pico-browser`, `battle-visual-browser`, `route-visual-browser`, `execute-feedback-browser`, `barrage-browser`, `final-polish-mobile-browser`, `stage-performance-browser`, `browser`, `world-map-art-browser`, `ui-polish-browser`。
