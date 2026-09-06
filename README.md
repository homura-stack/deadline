# DEAD/LINE

**通常時は耐える。時間停止中は考える。解除すると一瞬で支配する。**

DEAD/LINEは、敵弾を避けてTIME STOPゲージを溜め、停止した世界に一筆書きの攻撃ルートを描く10 Waveのブラウザアクションゲームです。SPACEで実行すると、自機だけが描いた線を超高速で移動し、ロックした敵を順番に撃破します。

TASK Dで実装した世界は、機械生命体のホタルPicoが5地区へ光を戻す小さな旅です。提供された正式背景10枚を使い、暗いBEFORE世界から、Picoの光を起点にAFTER世界が柔らかく広がります。CORE後はWORLD MAPの同期発光とエンディングへ進みます。[TASK Dの実装・検証・復元手順](TASK_D.md)を参照してください。以前の[TASK C](TASK_C.md)、アストラ版の[作品分析](REDESIGN.md)と[検証結果](ASTRA_VERIFICATION.md)は履歴として保存しています。

TASK E.1で、Git履歴に残る4ページの説明と2 TARGETの短い練習を、Picoの姿で復元しました。この練習内容を現在も維持しています。[旧版との差分・検証・復元手順](TASK_E1.md)を参照してください。STARTの現在の仕様は以下のG.2です。

TASK Fで、Picoをユーザー提供の正式な透過PNGへ差し替えました。旧素材は保持し、ゲームロジック・当たり判定・チュートリアル構造は変更していません。[素材・参照箇所・検証記録](TASK_F.md)を参照してください。

TASK F.1で、保存済みの初回選択に関係なく見つけられるよう、タイトルのSTART直下にTRAININGボタンを追加しました。E.1のチュートリアル本体とFの正式Picoは維持しています。[原因調査・修正・検証記録](TASK_F1.md)を参照してください。

TASK Gでは、提供された正式Picoタイトル画像を無加工で使用し、左下へSTART・TRAININGと補助メニューを配置しました。背景内のロゴ・コピーを重複表示せず、狭い画面では画像全体とメニューを分けます。F.1の進行・練習は維持しています。[タイトル素材・実装・検証記録](TASK_G.md)を参照してください。

TASK G.1で、タイトルを新たに指定された2752×1536の元JPEGへ再圧縮せず差し替えました。[画質調査・当時の初回判定・検証記録](TASK_G1.md)を参照してください。

TASK G.2では、受講済みでもSTARTから毎回TRAININGへ入るよう遷移だけを修正しました。`69521cf`型の現行チュートリアル本体・タイトル・正式Picoは変更していません。[変更範囲・テスト・復元手順](TASK_G2.md)を参照してください。

TASK Hでは、正式WORLD MAPのBEFORE / AFTER画像を無加工で導入しました。地区を復旧すると、その地区と接続回路だけにAFTERが柔らかく広がり、CORE後のSYNCで全景が点灯します。画像上の地区に操作ノードを合わせ、既存のTRAINING・戦闘・進行を維持しています。[素材・座標・復旧表示・検証記録](TASK_H.md)を参照してください。

## プレイ

- 開発中のTASK H確認: `http://127.0.0.1:4186/`（ローカルサーバー起動時）
- 公開URL: https://homura-stack.github.io/deadline/ （TASK F / F.1 / G / G.1 / G.2 / Hは未push・未反映）
- 対応環境: PC版Google Chrome / スマートフォン版Google Chrome
- ビルド・インストール: 不要

## 操作方法

| 操作 | PC | スマートフォン |
| --- | --- | --- |
| 自機移動 | ゲームフィールド内でマウス移動 | 画面下のMOVE PADをドラッグ |
| TIME STOP | ゲージ満タン時にSPACE | TIME STOPボタン |
| ルート描画 | ゲームフィールド内でドラッグ | TIME STOP中にMOVE PADをドラッグ |
| UNDO | Z | UNDOボタン |
| CLEAR | X | CLEARボタン |
| CANCEL | C | CANCELボタン |
| EXECUTE | SPACE | EXECUTEボタン |
| Waveリトライ | SPACE | RETRY WAVEボタン |

タイトル画面のSTARTまたはSPACEで、保存状態に関係なく毎回TRAININGへ直接進みます。練習を正常完了するとWORLD MAPへ進みます。既存の`deadline.tutorial.v1`への`completed`保存は維持しますが、STARTの遷移先を分ける判定には使いません。既存の途中退出先は未完了時がTITLE、受講済みの再練習時がWORLD MAPのままです。最初はGARDENのみ開始できます。地区を選んでENTERを押すと、その地区の戦闘へ進みます。未解禁地区はLOCKEDと表示され、戦闘には入れません。

タイトルのSTART直下のTRAININGから、初回・受講済みのどちらでも直接練習へ入れます。HOW TO PLAY →「Picoと操作を練習する」、WORLD MAPのTRAININGボタンも利用できます。旧版と同じEVADE → FREEZE → DRAW → EXECUTEの4ページで、マウス／MOVE PADの動きを見てから実習します。練習はPicoを64px動かす → TIME STOP → 2 TARGETを一筆書きで通る → SPACEで実行、という短い構成です。TIME STOPは旧版と同じ5秒。練習だけ安全猶予があり、実行時に弾を除去する旧版の扱いを維持しています。完了表示の約1秒後にWORLD MAPへ戻り、ENTER GARDENで本編を開始します。進行中のWORLD MAPから再受講した場合は、練習を終える／中断しても元の地区解禁・スコア・LIFEへ戻ります。練習中のR／「最初から」は練習だけを再開します。

GARDEN（WAVE 1–2）→FORGE（3–4）→CANAL（5–6）→SKYLINE（7–8）→CORE（9–10）の順で解禁します。各地区の2 WAVE目をクリアすると、短い静けさの後、Picoの位置からホタルの光が世界へ広がります。LIGHT RESTOREDの後、マップに復旧状態が残ります。CORE後は5地区の光が応答・同期し、エンディングを表示。RESTARTまたはTITLEを選べます。本編進行は今回のプレイ中だけ保持されます。本編でのR／「最初から」、タイトルへの帰還、リロードで新しい旅になります。

スマートフォンのMOVE PADは、通常時には自機、TIME STOP中には自機位置から始まる黄金色のDRAWカーソルを相対移動します。指を離してもルートとカーソル位置は維持され、再接触すると続きから描画できます。小さなドラッグは精密に、大きなドラッグは素早く反応し、DRAW時は通常移動の0.8倍の感度です。スマートフォンの戦闘入力はMOVE PAD＋画面ボタンだけで完結し、ゲームフィールドへの直接タップ・ドラッグ・長押しでは操作しません。SETTINGSのTOUCH SENSITIVITY（50〜150%、初期100%）はMOVEとDRAWの両方へ適用・保存されます。

## ゲームルール

1. 通常時間で弾幕を避け、TIME STOPゲージを溜めます。
2. 時間を止めると敵と実弾が完全に停止します。
3. 停止した弾の間を縫い、敵を通るルートを描いてロックします。
4. SPACEまたはEXECUTEで、自機がルートを超高速移動して敵を連続撃破します。

赤く表示されたルート区間は、停止中の実弾と接触する危険箇所です。描画中にはダメージを受けず、実行時に自機が実弾へ触れた場合だけ失敗します。

Wave 7〜10は **ONE STOP / ONE EXECUTION** です。1回のTIME STOPで全敵をロックし、撃破する必要があります。同じWaveで3回失敗するとTIME LIMIT ×1.5、5回失敗すると×2.0を任意で選べます。変わるのはルート描画時間だけです。

## ローカル起動

このディレクトリで静的HTTPサーバーを起動してください。

```sh
python -m http.server 4186 --bind 127.0.0.1
```

起動後、`http://127.0.0.1:4186/`をGoogle Chromeで開きます。`index.html`を直接開いても主要機能は動作します。

## 使用技術

- HTML
- CSS
- JavaScript
- Canvas API
- Web Audio API
- Pointer Events
- `requestAnimationFrame`
- `localStorage`（音量・タッチ感度・TRAINING正常完了）

ゲーム本体は外部JavaScriptライブラリ、ゲームフレームワーク、CDN、外部API、外部フォントを使用していません。GitHub Pagesへそのまま配置できる相対パスの静的構成です。

## Architecture

| パス | 責務 |
| --- | --- |
| `index.html` | タイトル、WORLD MAP、チュートリアル、ゲームHUDの静的な画面構造 |
| `journey.js` | 5エリアと既存WAVEの対応、選択・解禁・復旧表示の状態管理 |
| `world-map.js` / `world-map.css` | SVGの回路都市マップ、地区の呼吸する発光、SYNC・エンディング表示 |
| `stage-art.js` | 正式背景の先読み・キャッシュ、Pico起点の柔らかな復旧マスクとホタルの応答 |
| `styles.css` | レスポンシブ配置、状態別UI、短い画面演出 |
| `astra.css` | 改装版の配色・文字組み・画面構成と状態別演出 |
| `title-pico.css` / `title-screen.js` | 正式タイトル画像・メニュー配置・補助パネルの戻る操作。START / TRAININGの制御は既存の`game.js` |
| `title-art.js` | 旧Canvasタイトル図の保存ファイル。TASK Gのページでは読み込まない |
| `config.js` | Wave、弾幕、入力、描画、音響の調整値とWave定義 |
| `simulation.js` | DOMに依存しないゲーム状態、TIME STOP、ルート・TARGET判定、EXECUTE、敵弾、衝突、Wave進行 |
| `game.js` | マウス・キー・MOVE PAD入力、固定時間ゲームループ、DOM更新、シミュレーションイベントの振り分け |
| `renderer.js` | シミュレーション状態を変更しないCanvas描画と視覚効果 |
| `audio.js` | Web Audio APIによる合成SE、音量設定、AudioNodeの寿命管理 |
| `tutorial.js` / `tutorial.css` | TRAINING完了の軽量な保存と入口・旧説明図のPico表示。旧実習のWorld・進行は`game.js` |
| `assets/` | 正式ロゴなど、リポジトリ内で配信する静的素材 |
| `tests/` | Nodeロジックテストと実Chromeによる操作・描画・負荷検証 |

入力は`game.js`でゲーム座標へ変換され、`simulation.js`だけがゲーム状態を更新します。シミュレーションが発行した意味単位のイベントを`game.js`がUI・音・短命な演出へ渡し、`renderer.js`はその状態を読み取って描画します。この境界により、ゲームルールをブラウザAPIなしでテストできます。

## 素材・クレジット

- 既存ロゴ: プロジェクト提供の透過PNGを保存。ゲームヘッダーは既存のローカル書体の文字組み
- タイトル背景: ユーザー提供のGemini生成JPEGを無加工で使用。画像内のロゴ・コピーを使用し、メニューのみHTML/CSS。[素材記録](assets/title/README.md)
- Picoと敵3種類: 提供素材の透過PNG。弾・エフェクトはCanvas描画
- ステージ背景: ユーザー提供の完成JPEG10枚を無加工で導入。[一覧・ハッシュ](assets/stages/README.md)
- 効果音: Web Audio APIによる実行時合成
- 外部サーバーからの画像・音声読み込み: なし

本リポジトリにはライセンスファイルを含めていません。

## Testing

ロジックテストはブラウザAPIから独立した`simulation.js`を対象にしています。

- `simulation.test.cjs` — TIME STOP、ルート、TARGET、EXECUTE、衝突の基本契約
- `loop.test.cjs` — ゲージ、キャンセル、UNDO / CLEAR、リトライ、特殊射撃の状態遷移
- `barrage.test.cjs` — 射撃パターン、弾数上限、寿命、画面外破棄
- `waves.test.cjs` — 10 Wave、ONE STOP、スコア復元、任意の時間制限倍率
- `journey.test.cjs` — エリア解禁、画像準備待ち、復旧・同期発光の表示状態
- `tutorial.test.cjs` — Git由来の旧実装との一致、2 TARGET実習、正常完了だけの保存・旧保存状態・保存拒否時の動作
- `world-map-art.test.cjs` — 地区別露出の保持、進行状態の非変更、ホタル発光の連続性、SYNC後の全面AFTER

`*-browser.cjs`と`browser.cjs`は、Playwrightを検証用ドライバーとしてローカルのGoogle Chromeを操作し、PC・タッチ相当の入力、レスポンシブ表示、Canvasの実ピクセル、Web Audio、180弾負荷、コンソールエラーを確認します。Playwrightはゲーム本体の実行依存ではなく、配信ページから読み込まれません。

```sh
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs tests/journey.test.cjs tests/tutorial.test.cjs
node tests/title-routes-browser.cjs
node tests/title-quality-training-browser.cjs
node tests/browser.cjs
node tests/pico-tutorial-browser.cjs
node tests/tutorial-touchpad-browser.cjs
node tests/astra-browser.cjs
node tests/restoration-browser.cjs
node tests/stage-performance-browser.cjs
node --test tests/world-map-art.test.cjs
node tests/world-map-art-browser.cjs
```

以降の**毎TASKで`title-routes-browser.cjs`を必須回帰テストとして実行**します。A: TITLE → TRAINING → 実習完了 → MAP → GARDEN、B: 受講済みTITLE → START → TRAINING → 実習完了 → MAP → GARDEN、C/D/E: HOW TO PLAY / SETTINGS / CREDITSを開いてTITLEへ戻る、を実操作で確認します。正式Pico、常設TRAINING、Console / 画像ロードエラー、背景と操作の重なりも検証します。未保存時と完了済みのどちらもSTARTでTRAININGへ入り、実際に練習完了してから本編へ進むことを確認します。`title-quality-training-browser.cjs`は再読込・途中退出・旧保存状態と元JPEGのハッシュ・表示サイズも検証します。本編専用のテストは受講済みの隔離ブラウザを使い、TRAININGへ入った後に既存の手動退出ボタンでMAPへ移ります。STARTの受け入れテストでは実習を操作して完了します。

タイトルの確認対象は1920×1080 / 2560×1440 / 1366×768 / 1280×720 / 2560×1080 / 1024×768 / 768×800 / 390×844 / 320×800 / 844×390と連続リサイズです。3840×2160の原寸上限も確認します。従来の検証記録は[VERIFICATION.md](VERIFICATION.md)、画質調査は[TASK_G1.md](TASK_G1.md)、START遷移の検証は[TASK_G2.md](TASK_G2.md)、今回のWORLD MAPと回帰テストは[TASK_H.md](TASK_H.md)に記録します。

物理スマートフォンでの性能・操作・端末スピーカーの聴感、およびコンテスト主催者の最新規約本文との照合は別途確認が必要です。
