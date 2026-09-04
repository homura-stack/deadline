# 検証記録 — ビジュアルチュートリアル＋仮想タッチパッド

実施日: 2026-09-05。

## 結果

- BRIEFINGをEVADE / FREEZE / DRAW / EXECUTEの4ページへ変更し、各ページに本編と同じ図形・色を使ったSVG模式図と1〜3秒の短いループを追加した。`prefers-reduced-motion`では静止図になる。
- BEGIN TRAINING後に安全なPRACTICEを開始し、移動、TIME STOP、静止した2体を一筆書きでTARGET、EXECUTEの実入力を確認してからWave 1へ移る。PRACTICE中は接触無効でGAME OVERへ進まない。
- スマートフォンはMOVE PADのPointer Events差分をrequestAnimationFrameごとに集約し、既存`movePlayer()`へ相対座標として渡す。小入力は0.68倍から始まり、28pxで通常感度へ滑らかに移る。入力上限は1フレーム64px、感度50〜150%、初期100%。
- タッチパッドは単一`activePointerId`とpointer captureを使い、通常時間だけ有効。停止中はLOCKED。Canvasの通常時タッチ移動を無効化し、Canvasは停止中DRAW、MOVE PADは通常時移動に分離した。
- Windows Chrome **152.0.7977.82**でPRACTICE全工程、小／大ドラッグ、境界制限、STOP後のPADロック、PAD操作でルートが増えないこと、タッチボタン操作、PCマウス回帰を確認。rAF 70サンプルは60.2fps。
- 320×800、360×800、390×844、430×860、844×390、768×800、1280×720で横はみ出しと操作領域を確認。横持ちはフィールド左、PADとボタン右の2列にし、Canvas表示領域を約426×266px確保した。
- Nodeロジック **57 / 57 PASS**、タイトル／BRIEFING **2 / 2 PASS**、新規チュートリアル・タッチパッド **2 / 2 PASS**、EXECUTE演出 **9 / 9 PASS**、ルート演出 **2 / 2 PASS**、180弾負荷 **2 / 2 PASS**。確認範囲のpageerror／console errorは0件。

## 確認の境界

- Android / iOS物理端末は未確認。スマートフォン結果はWindows Chromeのタッチエミュレーションであり、端末固有の指の滑り、発熱、OSジェスチャーは実機確認が必要。
- チュートリアルの情報順と模式図は目視確認済みだが、初見プレイヤーが説明だけで理解できるかは第三者試遊で最終評価が必要。

変更: `config.js`, `game.js`, `index.html`, `styles.css`, `README.md`, `VERIFICATION.md`, `tests/browser.cjs`, `tests/execute-feedback-browser.cjs`, `tests/final-polish-mobile-browser.cjs`, `tests/route-visual-browser.cjs`, `tests/title-browser.cjs`。追加: `tests/tutorial-touchpad-browser.cjs`。ファイル削除なし。

---

# 検証記録 — tick / tock可聴性調整

実施日: 2026-09-05。

## 結果

- 時計音のテンポ0.96 / 0.76 / 0.60 / 0.52秒は変更せず、基本gainを0.011から0.024へ変更。SLASH比36.9%、TARGET比80%とした。TARGETは0.030へ微調整した。
- tickは22ms・3000→2200Hz・Q 4.2、tockは26ms・1700→1100Hz・Q 3.6のband-passノイズを芯にし、各々15／18msのsquare／triangle attackと7msの中高域クリックを重ねた。
- envelopeはattack 1.5ms、tick release 7ms、tock release 8ms。残り1秒以下はgain 1.05倍、0.5秒以下は1.10倍に留めた。
- Windows Chrome **152.0.7977.82**で`tick → tock → tick → tock`、実発音間隔960 / 768 / 600ms、4段階設定、CANCEL / EXECUTE / 時間切れ後の時計音0、全演出後AudioNode 0件を確認した。
- 音響・EXECUTE専用 **9 / 9 PASS**、Node標準テスト **56 / 56 PASS**、タイトル／BRIEFING回帰 **2 / 2 PASS**。未処理例外・コンソールerror **0件**。

変更: `audio.js`, `config.js`, `tests/execute-feedback-browser.cjs`, `README.md`, `VERIFICATION.md`。テンポ、BRIEFING、ゲームルール、HUD、Wave、戦闘演出は変更していない。ファイル削除、Gitステージ・コミット・プッシュは実施していない。

## 聴感確認の境界

- Chrome AudioContextの実動作、gain比、周波数、duration、envelope、交互順、音声停止とNode解放は確認した。
- この実行環境からスピーカー出力を直接聴取できないため、通常音量での聞こえ方や「カチ／コチ」と認識できるかの最終判断は未確認。実スピーカー／ヘッドホンで再試聴が必要。

---

# 前回の検証記録 — tick / tock聴感調整・初回BRIEFING

実施日: 2026-09-05。

## 結果

- tick / tock間隔を0.96 / 0.76 / 0.60 / 0.52秒へ変更。Windows Chrome **152.0.7977.82**で4段階と`tick → tock → tick → tock`の交互順を確認した。
- tickは10ms・4200→3200Hz・Q 5.5、tockは12ms・2700→1900Hz・Q 4.5のband-passノイズを主体にし、8〜10msの短い発振音を薄く重ねた。最短間隔は余韻の約43倍で、AudioNodeの時間的重複はない。
- タイトルSTART後にFREEZE / DRAW / EXECUTEの3手順を表示。SPACEまたはBEGIN入力まで`world.time`、敵、弾、Waveを更新しないことを確認した。通常リトライでは表示しない。
- PC 1280×720、390×844、844×390、320×800、360×800、768×800でBRIEFINGを画像保存し、3ステップ、キー表示、BEGIN、横・縦スクロールなしを確認した。
- 総合Chrome実操作 **31 / 31 PASS**、音響・EXECUTE専用 **8 / 8 PASS**、タイトル／BRIEFING **2 / 2 PASS**、Node標準テスト **56 / 56 PASS**、描画 **2 / 2 PASS**、180発負荷 **2 / 2 PASS**。未処理例外・コンソールerror **0件**。
- `prefers-reduced-motion`ではタイトル遷移を待たずBRIEFINGを即表示する。BRIEFING自体には装飾モーションを使用していない。

## 実装内容

1. `config.js`へ時計音の4間隔、duration、filter周波数、Q、終盤の微小gain倍率を集約した。
2. `audio.js`の時計音を短い高Qクリックへ変更し、tickとtockで周波数・音色・長さを分離した。CANCEL / EXECUTE / 時間切れ／非表示時の既存停止処理は維持した。
3. `index.html`と`styles.css`へ既存の暗いネイビー、シアン、細罫線、キーキャップに合わせたBRIEFINGを追加した。
4. `game.js`へ`briefingActive`を追加。タイトル遷移完了時はBRIEFINGだけを開き、BEGINで初めて`reset()`してゲームを開始する。固定更新ループはBRIEFING中にaccumulatorを0へ戻す。
5. `tests/title-browser.cjs`で6画面幅、`tests/browser.cjs`でPC／タッチ開始とリトライ、`tests/execute-feedback-browser.cjs`で時計音の順序・間隔・停止を検証した。

変更: `audio.js`, `config.js`, `game.js`, `index.html`, `styles.css`, `tests/browser.cjs`, `tests/execute-feedback-browser.cjs`, `tests/route-visual-browser.cjs`, `tests/title-browser.cjs`, `README.md`, `VERIFICATION.md`。ファイル削除、Gitステージ・コミット・プッシュは実施していない。

## 聴感確認の境界

- Chrome AudioContextの実動作、交互順、実発音間隔、音色構成、余韻長、gain、終了後のNode解放は確認した。
- この実行環境からスピーカー出力を直接聴取できないため、「コポコポに聞こえなくなったか」の最終的な実機聴感は未確認。前回の0.24秒最短間隔を0.52秒へ広げ、24msの丸いノイズを10〜12msの高域クリックへ置き換えたため、実機で再試聴が必要。
- Android / iOS物理端末は未確認。モバイル結果はWindows Chromeのタッチエミュレーションによる。

---

# 前回の検証記録 — EXECUTE統合演出・戦闘サウンド

実施日: 2026-09-04。

## 結果

- Node標準テスト **56 / 56 PASS**。敵AI、弾幕、ルート、TARGET、スコア、Wave、リトライの既存ルールを確認。
- Windows Chrome **152.0.7977.82**の専用実操作でCASE A〜F＋reduced motion **8 / 8 PASS**。未処理例外・コンソールerror **0件**。
- tick / tockは残り時間に応じて0.72 / 0.5 / 0.34 / 0.24秒間隔。CANCEL・時間切れ・EXECUTE後は時計音グループ0、全演出終了後は保持AudioNode 0件。
- EXECUTE入力からDASHまで59〜61ms。3体連続SLASHは約120〜128ms間隔、pitch倍率1.000 / 1.026 / 1.052。最大同時音声5、残像最大10個（上限20）。
- 実弾18発＋3TARGETの実行でrequestAnimationFrame間隔p95は16.9ms。既存180発隔離負荷もPC、4倍CPU低速タッチ相当ともPASS。
- スクリーンショットで静寂中、単体ヒット、3体連続ヒット、高密度弾幕後を目視比較。通過済み線の残光、未通過線、白シアンの敵フラッシュ、交差する斬撃線、破片、プレイヤー残像を確認。

## 実装内容

1. `audio.js`に時計、TARGET、DASH、SLASH、撃破、時間復帰の用途別メソッドを追加。SLASHは再利用ノイズバッファ、ハイパス掃引、短いpitch sweepを組み合わせた。
2. STOP中だけフレームループから時計音を駆動し、既存の2 / 1 / 0.5秒警告閾値で間隔を切り替える。setIntervalは使用しない。
3. SPACEで即`executing`へ移行し、約0.065秒は世界を停止したまま音を止め、その後DASHと移動を開始。最後の斬撃後は0.055秒の残光を経て復帰音と停止色解除を開始する。
4. ロック順ごとにSLASH pitchを+2.6%変化させ、各`hit`イベントでSLASHと撃破音、Canvasの敵フラッシュ・斬撃線・リング・破片を同期させる。
5. EXECUTE中は未通過線を薄く残し、通過箇所を短く発光。自機残像は0.18秒、12px間隔、最大20個に制限した。
6. AudioNodeはone-shot終了時の`onended`で切断・参照解除し、時計音は専用グループとしてCANCEL、EXECUTE、時間切れ、失敗、非表示時に即停止する。
7. `prefers-reduced-motion`では残像、解放リング、移動破片、画面揺れを省き、命中線、敵フラッシュ、撃破リング、音声フィードバックは維持する。

変更: `audio.js`, `config.js`, `game.js`, `renderer.js`, `tests/execute-feedback-browser.cjs`, `tests/browser.cjs`, `README.md`, `VERIFICATION.md`。ファイル削除、Gitステージ・コミット・プッシュは実施していません。

## 主観確認の境界

- 視覚演出はChrome描画画像を目視し、フィールド情報を隠さず、単体ヒットと撃破、ルート進行が区別できることを確認した。
- 音はChromeのAudioContextイベント順、音量比、周波数構成、同時音数、Node解放を確認した。実行環境からスピーカー出力を聴取できないため、「電子beepに聞こえないか」「耳疲れしないか」という最終的な聴感判断は未確認で、実スピーカー／ヘッドホンでの試遊が必要。
- Android / iOS物理端末の性能・音量・音色は未確認。

---

# 前回の検証記録 — 任意TIME LIMIT救済・ONE STOP予告

実施日: 2026-09-04。

## 結果

- Node標準テスト **56 / 56 PASS**。失敗1〜5回の解禁段階、未解禁倍率の拒否、×1.5／×2.0の停止時間、同Wave内の失敗数保持、次Waveの倍率1.0復帰を確認。
- Windows Chrome **152.0.7977.82**、Playwright headlessの実操作 **23 / 23 PASS**。3回目で×1.5、4回目も×1.5のみ、5回目で×2.0を表示し、SPACE通常再試行、数字キー選択、実際の停止時間を確認。
- Wave 6全滅後に`NEXT WAVE`予告で停止し、SPACE後の`NEW RULE`画面に説明と`TARGETS 5 / 5 → SPACE`が表示され、もう一度SPACEを押してからWave 7が始まることを確認。
- 390×844タッチ相当で3回失敗後の×1.5ボタンを選び、同じWave・ゲージ0%・倍率1.5へ移ることを確認。実機スマートフォンは未確認。
- 180発の隔離負荷確認 **3 / 3 PASS**。全ブラウザ検証で未処理例外・コンソールerror **0件**。

## 実装内容

1. `waveFailures[waveIndex]`へ通常被弾、EXECUTE中被弾、未完了、時間切れ、キャンセルを各1回記録。リトライでは保持し、全体再スタートで初期化する。
2. 3回失敗で`TIME LIMIT ×1.5`、5回失敗で`TIME LIMIT ×2.0`を解禁。SPACEは常に倍率1.0、PCは1／2キー、タッチは停止中の失敗画面ボタンから任意選択する。
3. 倍率は`stopTime()`でWave固有の`timeStopSeconds`へだけ掛ける。敵・弾・配置・攻撃・スコア・ゲージ・ロック・ONE STOP判定には使わない。
4. 選択倍率は現在Waveのリトライに保持し、次Wave生成時に1.0へ戻す。リトライ時ゲージ0%も維持する。
5. Wave 6後を`rule-preview`、Wave 7直前を`rule-intro`として分離。両方とも世界を停止し、個別のSPACE入力が必要。

変更: `config.js`, `simulation.js`, `game.js`, `index.html`, `styles.css`, `tests/browser.cjs`, `tests/waves.test.cjs`, `README.md`, `VERIFICATION.md`。ファイル削除、Gitステージ・コミット・プッシュは実施していません。

## 既知の確認点

- 自動検証では表示・選択・時間計算を確認済み。3回／5回という解禁タイミングと、Wave 6後にSPACEを2回使う説明テンポは人による試遊評価が必要。
- Android / iOS実機のタッチ操作・音・性能は未確認。

---

# 前回の検証記録 — 失敗Wave即リトライ・ゲージ0%

実施日: 2026-09-04。

## 結果

- Node標準テスト **55 / 55 PASS**。Wave 7のゲージ20／100%死亡、Wave 7〜10の各未完了リトライ、Wave 4通常死亡を検証し、すべて同じWave・ゲージ0%へ復元した。
- Windows Chrome **152.0.7977.82**、Playwright headlessの実操作 **21 / 21 PASS**。Wave 7の未完了EXECUTE後に同じWave・ゲージ0%へ戻り、通常時間で再充電してからWave 10まで通しクリアした。Wave 8〜10個別の再試行はNodeロジックで確認。
- 390×844タッチ相当で被弾後の`RETRY WAVE 1`を操作し、同じWave・ゲージ0%・敵弾0・ルートなしへ復元することを確認。実機スマートフォンは未確認。
- SPACEを押したままEXECUTE中に被弾させ、失敗表示後もキーを離すまでリトライされず、押し直した1回で通常状態へ戻ることを確認。即TIME STOPへの二重遷移なし。
- 180発の隔離負荷確認 **3 / 3 PASS**。全ブラウザ検証で未処理例外・コンソールerror **0件**。

## 修正内容

1. 原因は`failed`状態のSPACE・Enter・画面ボタンが全体初期化`createWorld()`を呼び、ONE STOP専用の`retryWave()`を経由していなかったこと。EXECUTE中に弾へ触れた場合もこの経路でWave 1へ戻っていた。
2. Wave開始時に自機位置、スコア、最大連鎖、PERFECT回数、HITS、敵・弾IDの開始位置をスナップショット化。通常死亡とONE STOP失敗を共通`retryWave()`へ接続した。
3. 再試行では敵をWave定義から再生成し、HP・位置・射撃タイマー・弾・ルート・ロック・実行・安全猶予・失敗理由・Wave一時値を初期化する。ゲージは失敗時とWave開始時の値を使わず、`waves.retryGaugeInitial`の0へ設定する。
4. 失敗試行中のスコア、最大連鎖、PERFECT回数、HITSをWave開始時へ戻す。敵ID・弾IDも同じ開始値へ戻すため、前回試行の状態を参照しない。
5. 通常死亡とONE STOP未完了の両画面に`[SPACE] RETRY WAVE N`を表示。PCはSPACE、タッチは同じ画面ボタンから即再試行できる。

変更: `config.js`, `simulation.js`, `game.js`, `index.html`, `tests/simulation.test.cjs`, `tests/browser.cjs`, `tests/waves.test.cjs`, `README.md`, `VERIFICATION.md`。ファイル削除、Gitステージ・コミット・プッシュは実施していません。

## 既知の確認点

- 自動検証では状態復元を確認済み。0%から再び回避する負担とリトライテンポの体感は実プレイ評価が必要。
- Android / iOS実機のタッチ操作・音・性能は未確認。

---

# 前回の検証記録 — 10Wave・後半ONE STOP試験

実施日: 2026-09-04。

## 結果

- Node標準テスト **52 / 52 PASS**。10Wave構成、Wave 6のPERFECT、Wave 7開始前説明、ONE STOP未完了・時間切れ・キャンセルの分岐、同一Waveリトライ、Wave 10クリアを検証。
- Windows Chrome **152.0.7977.82**、Playwright headlessの実操作 **20 / 20 PASS**。実際のゲージ回復、弾幕回避、STOP、ルート描画、Wave 1〜10連続クリア、結果表示、再挑戦を確認。
- 180発の隔離負荷確認 **3 / 3 PASS**。PCと390×844タッチ相当・4倍CPU遅延で、描画・固定ステップ・512点経路計算とコンソールエラーを確認。
- 全ブラウザ検証で未処理例外・コンソールerror **0件**。
- **スマートフォン実機は未確認**。Windows Chromeの390×844タッチエミュレーションで主要操作を、844×390と幅320 / 360 / 768で横はみ出しがないことを確認。

## 実装・検証内容

1. `config.js`の`waves.definitions`を10Waveへ拡張。敵数は3→10体、全敵HP 1、移動速度18〜24px/秒、発射間隔倍率1.2〜0.8、弾速倍率0.85〜1、攻撃タイプ別弾数をWave単位で保持する。
2. Wave 1〜6は複数回STOP可能。Wave 6を1回のSTOPで全滅させると`PERFECT EXECUTION`を表示し、後半ルールを先に体験できる。
3. Wave 6後は専用画面で`ONE STOP / ONE EXECUTION`と`1回のTIME STOPで全敵を撃破せよ`を明示する。SPACEまたはタッチのSTART操作後だけWave 7が始まる。
4. Wave 7〜10は1回のSTOP／EXECUTIONで全敵撃破が必須。STOP中は`LOCK X / N`を表示し、全ロック時は`ALL TARGETS LOCKED`、未ロック敵には点滅する二重リングを表示する。
5. 一部だけロックしてEXECUTEした場合も選択対象を実際に撃破してから`EXECUTION INCOMPLETE X / N`を表示する。得点と最大連鎖は試行前へ戻し、SPACEまたはタッチで同じWaveをゲージ満タンから再挑戦できる。
6. ONE STOP中の時間切れは`TIME OVER`、キャンセルは`CANCELLED`として未完了と区別する。Z/Xによる編集は回数に含めず、1回のSTOP内で何度でも修正できる。
7. Wave 10はAIM 3、FAN 3、BURST 2、ROTATE 2の10体。停止時間を6.4秒に広げ、全ロック実行後に短い静止、強いPERFECT演出、GAME CLEAR結果へつなぐ。
8. GAME CLEARにはSCORE、MAX EXECUTION、PERFECT回数、HITSを表示。通し検証では18400点、最大10連撃、PERFECT 5回、被弾0を確認し、SPACEでWave 1・0点へ戻った。
9. `tests/artifacts/one-stop-incomplete-desktop.png`、`wave-10-plan-desktop.png`、`wave-10-complete-desktop.png`、`gauge-route-mobile.png`へ主要状態を保存した。

## 既知の確認点

- GAME CLEARへ到達するには被弾していない必要がある1ライフ制のため、現仕様のHITSは必ず0。将来ライフ制を変更する場合に計測欄として機能する。
- 自動テストは安全経路を探索して各Waveを全滅させる。人がWave 7説明を一読で理解できるか、Wave 10の6.4秒が十分か、ONE STOP失敗後に再挑戦したくなるかはプレイテストが必要。
- 近接敵のロック番号、小画面で指が線端を隠す点、大量の弾と長い線の再計算負荷は以前から残る。
- GitHub Pagesの実公開、Android / iOS実機の操作・音・性能は未確認。

変更: `config.js`, `simulation.js`, `renderer.js`, `game.js`, `audio.js`, `index.html`, `styles.css`, `tests/simulation.test.cjs`, `tests/barrage.test.cjs`, `tests/browser.cjs`, `tests/waves.test.cjs`, `README.md`, `VERIFICATION.md`。ファイル削除、Gitステージ・コミット・プッシュは実施していません。

---

# 前回の検証記録 — 3Wave・敵役割・連続撃破報酬

実施日: 2026-09-04。

## 結果

- Node標準テスト **50 / 50 PASS**。既存45件をWave仕様へ更新し、戦闘を止めないWave表示、3Wave遷移・連鎖得点・ALL CLEAR・COMPLETE・Wave別HPの5件を追加。
- Windows Chrome **152.0.7977.82**、Playwright headlessの実操作 **20 / 20 PASS**。実際のゲージ回復・弾幕回避・STOP・安全経路描画で3Waveを連続クリア。
- 180発の隔離負荷確認 **3 / 3 PASS**。PCとタッチ相当4倍CPU遅延、コンソールエラー確認を実施。
- 全ブラウザ検証で未処理例外・コンソールerror **0件**。
- **スマートフォン実機は未確認**。Windows Chromeの390×844タッチエミュレーションで主要操作を、844×390と幅320 / 360 / 768で横はみ出しがないことを確認。

## 実装・検証内容

1. `config.js`の`waves.definitions`から敵を生成。Wave 1はAIM 3体、Wave 2はAIM 2・FAN 1・BURST 1、Wave 3はAIM 1・FAN 1・BURST 1・ROTATE 2。
2. Waveごとに敵HP、移動速度、発射間隔倍率、弾速倍率、タイプ別弾数、位置と初期角度を保持。進行につれて3→4→5体、20→22→24px/秒、発射間隔1.1→1→0.9倍、弾速0.9→0.95→1倍となる。
3. Wave開始の0.8秒表示は戦闘を止めない。全滅後は実弾を消し、世界を1.25秒休止して次Waveへ進む。旧無限補充は撤去。
4. 敵形状はAIM三角、FAN五角形、BURST円、ROTATEひし形。既存の中央点と、ROTATEの砲身方向も維持し、色以外で識別できる。
5. ロック順に合成SEの音程を上げ、マーカーの線幅・発光とHUDのLOCK数を段階的に強めた。超高速実行、短いヒットストップ、最後の強いSE・振動・エフェクトは維持。
6. 同一EXECUTEの表示は1 KILL / DOUBLE / TRIPLE / QUAD / N KILLS。1体100点に、連鎖順ごと50点を加算。残存敵を1回で全滅するとALL CLEARと500点を加算。
7. Wave 3後はCOMPLETE画面へ遷移し、SCORE、MAX CHAIN、HITS、RETRYを表示。実ブラウザの3→4→5体全滅では3650点、最大5連撃、被弾0を確認。SPACEでWave 1・0点へ即リトライできた。
8. STOP中の世界固定、実弾の障害物、Z/X/C/SPACE、PCクリック実行禁止、タッチEXECUTE、危険線、ゲージ、実行後安全猶予はブラウザ回帰検証を通過。
9. Wave 3の停止画面とCOMPLETE画面を`tests/artifacts/wave-3-plan-desktop.png`、`wave-complete-desktop.png`へ保存した。

## 既知の確認点

- COMPLETEへ到達するには被弾していない必要がある1ライフ制のため、現仕様のHITSは必ず0。将来ライフ制を変更する場合に計測欄として機能する。
- 自動テストは安全経路を探索して一度のSTOPで各Waveを全滅させる。人が初見で同じ連続撃破を狙いたくなるか、Wave 1→3の難易度差、達成感、リトライ意欲はプレイテストが必要。
- 近接敵のロック番号、小画面で指が線端を隠す点、大量の弾と長い線の再計算負荷は以前から残る。
- GitHub Pagesの実公開、Android / iOS実機の操作・音・性能は未確認。

変更: `config.js`, `simulation.js`, `renderer.js`, `game.js`, `audio.js`, `index.html`, `styles.css`, `tests/simulation.test.cjs`, `tests/barrage.test.cjs`, `tests/loop.test.cjs`, `tests/browser.cjs`, `README.md`, `VERIFICATION.md`。追加: `tests/waves.test.cjs`。ファイル削除、Gitステージ・コミット・プッシュは実施していません。

---

# 前回の検証記録 — Z / X / C / SPACE操作

実施日: 2026-09-03。今回の変更は入力と操作表示のみです。

## 今回の結果

- Windows Chrome **152.0.7977.65**、Playwright headlessで **19 / 19 PASS**。
- 未処理例外・コンソールerror **0件**。`game.js`、`tests/browser.cjs` の構文確認と変更ファイルの空白エラー確認も通過。
- PCのマウス・キー入力、Chromeのタッチエミュレーション、入力方式の途中切り替えを確認。
- **スマートフォン実機は未確認**。Android / iOS実機のChrome、物理キーボードでの手触りは人による確認が必要です。
- ゲージ・弾幕・敵配置・描画／ロック・実行・難易度の処理と調整値は変更していません。下段の45件のロジック検証と負荷測定は前回作業の記録です。今回は入力を含むブラウザの回帰確認を実施しました。

## 操作変更と確認内容

1. **Z = UNDO、X = CLEAR、C = CANCEL、SPACE = TIME STOP / EXECUTE**。PCの停止／実行を独立したSPACE押下で操作し、安全なルートの終点まで到達することを確認。
2. 通常時はZ/X/Cを無効・弱表示にし、SPACE付きTIME STOPを表示。STOP中はZ/X/Cのキー枠と、大きめのSPACEキー枠、「SPACEキーで実行」を表示。保存画像でPC／タッチの表示を確認。
3. PCの停止中ボタンを無効化。クリックハンドラーでも `pointerType === 'touch'` のときだけ停止中の実行を許可し、マウス／Enterから実行されないことを確認。通常時のクリックSTOPは維持。
4. `event.repeat` と押下中キーの集合で、1回の押下を1アクションに限定。keyupで解放し、ウィンドウがフォーカスを失った際も集合を解除。繰り返し時を含めキーの標準動作を抑止し、フォーカス中ボタンのSPACE長押しで即実行・スクロールが起きないことを確認。
5. XはSTOPを継続したままルートを消去。Zは既存仕様通り最後の保存点を戻す。描画途中のキー操作でキャプチャを解放し、マウスを離しても取り消した点を追加し直さないことを確認。
6. CはカーソルをUIへ動かさずキャンセルでき、位置・料金（実質40消費）・再充電の条件を維持。
7. 通常時の入力にゲーム内枠（四辺24px）の座標判定と `elementFromPoint` によるUI判定を追加。ポインターキャプチャ中にUIや枠外へ移動／解放しても最後の有効位置を維持し、フィールドへ戻ると追従が再開することを確認。描画入力は従来通り。
8. タッチ時はキー枠を隠してTIME STOP / EXECUTE / UNDO / CLEAR / CANCELを操作可能。5操作とスクロールなしのルート実行を確認。マウスへ切り替えるとクリック実行を禁止し、その後のタッチでは再び実行可能。
9. タッチ相当390×844、横持ち844×390、幅320 / 360 / 768のレイアウトで横はみ出しなし。静的 `file://` 起動、デバッグ非表示、外部通信不要も確認。

`tests/browser.cjs` の19件は、前回の16件を新操作へ更新し、フィールド外追従・SPACE二重入力／キー表示・入力方式切り替えの3件を加えたものです。最初の試行はテスト側が空ルートの即時終了イベントを更新フレームで待ってタイムアウトしました。即時の状態確認へ修正後、19件すべてを通過しました。ゲームの空ルート処理は変更していません。

## 今回の変更ファイルと残る確認

変更: `game.js`, `index.html`, `styles.css`, `tests/browser.cjs`, `README.md`, `VERIFICATION.md`。追加ファイルなし。テスト画像・JSONは既存のGit対象外 `tests/artifacts/` へ保存。

検証範囲で新しい操作不具合はありません。UIへ向かう途中でもフィールド内にいる間は自機が追従するため、戦闘操作にはキーを使ってください。停止時間5秒による自動実行は既存仕様として維持しています。スマートフォン実機、初心者がキー表示だけで操作を理解できるか、長時間の使用感は未確認です。

Gitステージ・コミット・プッシュ・ファイル削除は実施していません。

---

# 前回の検証記録 — ゲージ・計画の修正・安全猶予・5種の敵

実施日: 2026-09-03。

## 結果

- Node標準テスト **45 / 45 PASS**（ルート18件、弾幕12件、今回のゲージ等15件）。
- Windows Chrome **152.0.7977.65**、Playwright headless: 実操作 **16 / 16 PASS**、隔離負荷・エラー確認 **3 / 3 PASS**。
- ブラウザ検証中の未処理例外・コンソールerrorは **0件**。
- マウスとタッチの双方で、通常時間で回避・充電 → STOP → 危険ルートの修正 → 安全ルートの実行を確認。
- **Android / iOS実機は未確認**。モバイル検証はWindows Chromeのタッチエミュレーションです。

## 今回の仕様と実装

1. 最大100・初期20・通常時間毎秒20回復。満タン時のみSTOP可能で、発動時100消費。
2. 通常時、中心間32px以内で接触を避けると8加算。既存の線分・円判定を再利用し、弾1個につき1回だけ。無敵・STOP・実行中は加算しない。
3. キャンセルの実質消費40。発動時の残高を記録し、差額を返す。無料連打と二重返金を禁止。
4. 赤い線は静的な接触警告。コード調査でも従来の描画処理自体に被弾はなかった。5秒自動実行との混同を避ける短い説明と編集操作を追加。
5. 右クリック／UNDOで最後の保存点を戻し、CLEARで開始点だけへ戻す。警告とロック順を再計算し、残り時間・ゲージは回復しない。
6. CANCEL／Escは実行せず通常復帰。ルートを捨て、自機は動かさない。キャンセルに新たな無敵は付けない。
7. 非空ルートの時間切れは自動実行。空なら通常復帰。どちらも時間切れ自体でミスにはならず、空でも発動消費は維持。
8. 実行は最後の敵を倒した後も保存した最終地点まで進む。弾への接触は実際に移動した区間で判定。通常時間にも従来通り接触ダメージがある。
9. 完走後0.5秒、敵本体・敵弾・カーソル移動時の接触に無敵。白い輪を表示し、通常時間で減算。再実行中には持ち越さない。空実行では新たに付けない。
10. AIM三角／FAN五角形／BURST円／ROTATEひし形／DELAY六角形。色だけに依存しない。
11. ROTATEは0.12秒間隔で8発、22.5度ずつ方向を回す。DELAYは照準固定の0.65秒予兆から230px/秒の弾。予兆は短い弧・方向マーカー・本体の明るさで表現。
12. 敵6体の比率は `typeWeights` から整数配分。既定でAIM1・FAN2・BURST1・ROTATE1・DELAY1。詳細な初期値と操作はREADMEに記載。

## ロジック検証

新しい `tests/loop.test.cjs` の15件で次を検証しました。

- 開幕STOPのAPIレベルの禁止と、ニアミスなし4秒で初回満タン。
- 通常時間だけの回復と、発動の二重消費防止。
- キャンセル料金の精算、二重返金防止、無敵の付与なし。
- 最大値・初期量・消費・キャンセル料金の独立した調整。
- 自機移動によるニアミス、同じ弾を往復した際の重複防止。
- 実弾移動によるニアミス、直接被弾時には加算しない。
- 無敵・STOP・実行中のニアミス稼ぎを防止。
- 赤いルートを描いても生存し、Undo / Clearで警告・ロックを再計算。
- 以前の無敵が残っていても危険ルートの実行時には被弾。
- 最後の敵を通過して終点へ到達し、0.5秒の敵接触無敵が正しく終了。
- 弾接触・カーソル移動でも安全猶予が有効で、終了後に判定が戻る。
- 描画済み／空ルートの時間切れ、空実行で無敵を増やせない。
- ROTATEの弾数・各弾の方向・次の射撃への角度持ち越し。
- DELAYの予兆・発射待ち、停止をまたぐ照準固定、発射後の弾速。
- 出現比率の整数配分と、全重み0の場合のフォールバック。

従来30件も現仕様で再実行。ルート用の隔離テストは明示的にゲージを満たしたfixtureで実行し、無制限STOPを前提とする旧期待値は撤去しました。起動直後の制限は上記の別テストと実ブラウザで確認しています。

## Chrome実操作16件

1. 開幕にボタンとSpaceの両方でSTOPできない。
2. 5タイプが存在し、DELAYの初弾前に予兆が出る。
3. 通常時に弾幕とゲージが増え、READY表示後のSTOPで消費される。
4. 停止弾を横切る線は警告のみ。世界位置・時計・弾寿命が固定。
5. 右クリック、UNDO、CLEARで修正でき、時間・残高は増えない。
6. CANCELで移動せず通常へ戻り、実質40消費、再STOPは不可。
7. 実弾を避けた線を描き、ロック順に撃破、終点へ到達。実行中の世界固定と直後の安全猶予を確認。
8. 実行終了後に世界・回復が再開し、即STOPは不可。
9. 危険な線を確定・実行すると被弾。即リトライで初期ゲージへ戻る。
10. 空の5秒タイムアウトは生存して通常へ戻り、消費維持・無敵なし。
11. 線がある5秒タイムアウトは修正済みルートを自動実行。
12. タッチで充電・STOP・危険な描画・Undo / Clear・料金付きキャンセル。
13. タッチで安全な迂回ルートを実行して終点へ到達、意図しないスクロールなし。
14. 横持ち844×390、幅320 / 360 / 768で横はみ出しなし。
15. `file://` 直接起動、外部通信なし、通常URLでデバッグ非表示。
16. 未処理例外・コンソールエラーなし。

起動時のゲージや敵を都合よく変更せず、実際のマウス／キー／CDPタッチ入力で操作しています。迂回点列の探索だけをテスト側で行い、ゲームに自動回避や経路探索は追加していません。

## 180発の隔離負荷試験

既存の弾数上限・寿命・画面外破棄・配列の再利用・遠距離の衝突計算省略を維持しています。960×600 CSS pxの別Canvasに180発を置き、120フレームを測定しました。これは衝突で負荷が停止しないよう隔離したfixtureであり、プレイ可能性を示すテストではありません。

| 条件 | 描画呼び出し p95 | 固定更新2回 p95 | フレーム間隔 p95 | 512点のルート判定 中央値 / p95 |
| --- | --- | --- | --- | --- |
| PC、ピクセル比1 | 0.30ms | 0.10ms | 16.80ms | 1.00 / 4.80ms |
| タッチ、比2、CPU4倍遅延 | 1.30ms | 0.50ms | 17.00ms | 4.90 / 17.10ms |

実機のGPU、熱、音声、長時間の操作を保証する測定ではありません。大量の弾と長い線では一時的な再計算負荷が残ります。

## 画面確認・残る問題

保存したPCの5タイプ・DELAY予兆、スマートフォンのゲージ・編集ボタン・警告後の修正・安全なルートの画像を確認しました。`tests/artifacts/gauge-*.png` とJSON結果はGit対象外です。

- 近接敵のロック番号が重なる場面は残ります。
- 小画面の弾・形状の見分け、指による先端の隠れ方は実機確認待ちです。
- 4〜5秒の充電、ニアミス8、キャンセル40、安全猶予0.5秒、DELAYの速度と予兆が適切かは人のプレイテストが必要です。
- 検証範囲で進行を妨げる不具合はありませんが、全状況で回避可能な弾幕であることは保証していません。
- GitHub Pagesの実公開は未実施。静的相対パスと直接起動を確認しています。

## 変更ファイル

変更: `config.js`, `simulation.js`, `renderer.js`, `game.js`, `index.html`, `styles.css`, `tests/simulation.test.cjs`, `tests/barrage.test.cjs`, `tests/browser.cjs`, `tests/barrage-browser.cjs`, `README.md`, `VERIFICATION.md`。

追加: `tests/loop.test.cjs`。

`audio.js` は変更なし。外部ゲームライブラリ・本番素材・追加モードは追加していません。Gitステージ・コミット・プッシュ・ファイル削除は実施していません。

---

# 最終仕上げパス検証（2026-09-05）

タイトルへMASTER / SFX / MUTEを追加し、個別SE→SFX GainNode→MASTER GainNode→destinationへ統合しました。localStorageの正常復元、壊れたJSONから80 / 90 / OFFへのフォールバック、MUTE中のMASTER gain=0、解除後の値保持をChromeで確認しています。

Wave 1の実戦誘導はFREEZE→DRAW→EXECUTEの実状態イベントで進み、最初の撃破後に消え、同Waveリトライでは再表示しません。被弾時は赤フラッシュ、自機反応、LIFE強調、弱い揺れ、専用低域SEを同期させました。GAME OVERはWAVE / SCORE / KILLS、MISSION COMPLETEはSCORE / CLEAR TIME / KILLS / MAX EXECUTIONとRETRY / TITLEを表示します。

Wave開始には0.8秒の接触無効時間を設定し、既存の初弾待ち1.2秒と射撃パラメーターは維持しました。弾はAIM円、FANひし形、BURST中心点付き円、ROTATE四角、DELAY三角とし、停止中の灰橙色への沈みは維持しています。

検証結果:

- Nodeロジック: 57 / 57 PASS。
- Chromeタイトル・SETTINGS・BRIEFING・GAME OVER: 7 viewport PASS（1280×720、1920×1080、390×844、844×390、320×800、360×800、768×800）。
- Chrome通しRUN 1: TITLE→SETTINGS→START→BRIEFING→実戦誘導→GAME OVER→同Wave RETRY PASS。
- Chrome通しRUN 2: TITLE→全10Wave→MISSION COMPLETE→TITLE PASS。最終KILLSは57。
- Chrome通しRUN 3: タッチ相当でTITLE / BRIEFING / GAME / GAME OVER / RETRY、設定と44px操作領域 PASS。
- EXECUTE音響CASE A〜F、CANCEL・時間切れのclock停止、AudioNode解放、reduced motion PASS。
- 180弾負荷: PCおよび4倍CPU遅延タッチ相当 PASS。
- コンソールerror、pageerror、未処理例外なし。

物理スマートフォンの端末スピーカー聴感、発熱、指での長時間操作は未確認です。Gitステージ・コミット・プッシュ・ファイル削除は実施していません。
