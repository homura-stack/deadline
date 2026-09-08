# TASK L — Feedback Clarity Pass

## 変更内容

- TRAINING説明を `EVADE → NEAR MISS → FREEZE → DRAW → EXECUTE` の5枚にした。既存4枚の相対順序を維持し、NEAR MISSを短い2文と既存Pico／敵画像を使った図で説明する。後続の実践は既存の移動・実際のNear Miss報酬・本人のSPACE／タッチ入力を維持。
- 満タン中にゲージ限定の弱い白い波動を繰り返す。到達時の強い波動を優先し、周期表示からREADYイベントや音を再発火しない。STOP・死亡・画面退出で解除する。Reduced Motionでは周期波動を止め、既存の静的発光を残す。
- 被弾の白フラッシュ／ヒットストップを300msにし、その後350msの死亡リアクションを経てGAME OVER。既存の先行リトライ入力を保持する。
- 共通音量のみを4.0倍へ変更。個別SE倍率、Limiter、MASTER／SFX設定、保存形式、ミュート処理は維持。

## パラメータ（TASK K実装状態からの差分）

| 項目 | 変更前 | 変更後 |
|---|---:|---:|
| TRAININGスライド | 4枚 | 5枚 |
| 満タン中の波動周期 | なし | 1.25秒 |
| 満タン中の波動拡張／最大不透明度 | なし | 3px／0.18 |
| 被弾ヒットストップ | 200ms | 300ms |
| Pico白フラッシュ | 200ms | 300ms |
| 停止後の死亡リアクション | 400ms | 350ms |
| GAME OVERまで | 600ms | 650ms |
| 共通音量ゲイン | 2.5倍 | 4.0倍（前回比1.6倍、約+4.08dB） |

到達時READYは120ms白フラッシュ・320ms波動・最大6pxのまま。Near Miss半径40px、報酬+16、通常回復15/sec、被弾判定、TIME STOPコストは変更しない。

Wave設定全体の作業前後SHA-256は同一：
`29a7752894aec2e5e00184ac5fcf3369c7c96933d09c1ba55ca3414b6f5c4b2b`

## TASK Lで編集・追加したファイル

実装：`config.js`, `game.js`, `index.html`, `tutorial.css`, `ui-polish.css`。

テスト：`tests/astra-browser.cjs`, `tests/audio-output-browser.cjs`, `tests/audio.test.cjs`, `tests/browser.cjs`, `tests/feedback-l-browser.cjs`（追加）, `tests/feedback-l.test.cjs`（追加）, `tests/final-polish-mobile-browser.cjs`, `tests/gameplay-k-browser.cjs`, `tests/pico-tutorial-browser.cjs`, `tests/run-browser-suite.cjs`, `tests/title-browser.cjs`, `tests/tutorial-entry-browser.cjs`, `tests/tutorial-helpers.cjs`, `tests/tutorial-touchpad-browser.cjs`。

報告：`TASK_L.md`。作業開始前からあるTASK J/Kの未コミット変更を維持。ファイル／素材の削除、外部ライブラリ追加、commit／pushは行わない。

## 検証

- Node：`node --test tests/*.test.cjs` — **94 / 94 PASS**（既存91件＋追加3件）。
- Chrome 152.0.7977.82：既存19本＋TASK K追加3本＋TASK L追加1本、**全23スクリプトのPASSを確認**（修正後の再実行を含む）。
- 全件ランナーの初回は20 / 23 PASS。`title-browser.cjs` のSPACE入力回数と `tutorial-entry-browser.cjs` のPico画像数に残っていた4枚固定の前提を5枚に更新し、両方のスクリプト全体を再実行してPASS。検証の削除は行っていない。
- `barrage-browser.cjs` は初回にChromeの `ERR_NO_BUFFER_SPACE` を1件記録。描画負荷の条件自体は通過していた。同一スクリプトを変更せずに3回連続で再実行し、すべてPASS。読込エラーの発生原因は未確定であり、再実行成功を安定性の保証とはしない。
- TASK L専用Chromeテストも再実行してPASS。実際のNear Miss報酬→READY→SPACE、1.25秒周期の実アニメーション反復、弱い不透明度／拡張、イベント・SEの非再発火、STOP時の解除、Reduced Motionを確認。
- 既存TRAININGのPC／タッチ操作、保存・再読込・ミュート、説明ページ順、スマホ相当のNEAR MISSスライド表示、全Wave進行・復旧・再挑戦・EXECUTEを確認。
- 死亡描画をフレーム単位で確認。300ms停止中に画像／代替描画のPicoが白く表示され、粒子が停止し、停止後にリアクションが進む。GAME OVERは測定で約651〜654ms。先行SPACEも650ms前後でリトライされる。
- ChromeのOfflineAudioContextで10種類のSE、連続LOCK、10体連続撃破、Near Miss＋READY、強制同時重複を検証。旧2.5倍基準からのRMS増加は約1.6倍。通常の連続イベントのピークは約0.593（抑制開始0.8未満）、強制重複時は約0.931（上限0.95未満）。通常撃破／最終撃破、CLEAR／PERFECTの音量階層と音源解放もPASS。
- JavaScript構文確認、`git diff --check`、Wave設定ハッシュ照合はPASS。ステージ済みファイルなし。

全件初回の結果は `tests/artifacts/task-l/suite-logs/summary.json`、再検証記録は `tests/artifacts/task-l/rechecks.json`。TASK L専用の音声計測・READY／スライド画像は `tests/artifacts/task-l/`、既存テストの画像・詳細計測は従来の `tests/artifacts/` 配下に保存する。これらはGit対象外。

## 次回の人間確認（4項目）

1. NEAR MISSの説明から実践まで、リスクとゲージ報酬の関係が伝わるか（PC／実機タッチ）。
2. 満タン中の弱い波動が視界の端で認識でき、到達時演出と区別できるか。弾幕の邪魔にならないか。
3. 300msの被弾停止と650msでのGAME OVERが、死亡認識と即リトライの両方に適切か。
4. 普通のPCスピーカーで重要SEが十分聞こえ、連続LOCK／撃破でも強弱や音質が保たれるか。

自動テストは実機タッチ・聴感音量・体感難易度を保証しない。Waveの追加調整は行わない。
