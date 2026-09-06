# DEAD/LINE

**通常時は耐える。時間停止中は考える。解除すると一瞬で支配する。**

DEAD/LINEは、敵弾を避けてTIME STOPゲージを溜め、停止した世界に一筆書きの攻撃ルートを描く10 Waveのブラウザアクションゲームです。SPACEで実行すると、自機だけが描いた線を超高速で移動し、ロックした敵を順番に撃破します。

アストラ改装版は、時間を観測する計器をモチーフに、翡翠色の静かな導線が金白色の斬光へ変わるビジュアルへ全面改装しています。ゲームルールは元版のままです。[元版と改装版の切り替え手順](RESTORE.md)、[作品分析とアートディレクション](REDESIGN.md)、[今回の検証結果](ASTRA_VERIFICATION.md)を参照してください。

## プレイ

- 公開URL: https://homura-stack.github.io/deadline/
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

タイトル画面のSTARTまたはSPACEで、EVADE / FREEZE / DRAW / EXECUTEの4ページBRIEFINGへ進みます。本編と同じ自機・敵・弾・ルートに、マウス／MOVE PAD／キーの入力図を重ね、入力と結果を短い同期デモで示します。最後のBEGIN TRAINING後は、移動・時間停止・2体TARGET・EXECUTEを実際に試す安全なPRACTICEを経てWave 1を開始します。SKIP TUTORIALも選択でき、リトライ時はチュートリアルを再表示しません。

スマートフォンのMOVE PADは、通常時には自機、TIME STOP中には自機位置から始まるシアンのDRAWカーソルを相対移動します。指を離してもルートとカーソル位置は維持され、再接触すると続きから描画できます。小さなドラッグは精密に、大きなドラッグは素早く反応し、DRAW時は通常移動の0.8倍の感度です。スマートフォンの戦闘入力はMOVE PAD＋画面ボタンだけで完結し、ゲームフィールドへの直接タップ・ドラッグ・長押しでは操作しません。SETTINGSのTOUCH SENSITIVITY（50〜150%、初期100%）はMOVEとDRAWの両方へ適用・保存されます。

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
- `localStorage`（音量・タッチ感度設定）

ゲーム本体は外部JavaScriptライブラリ、ゲームフレームワーク、CDN、外部API、外部フォントを使用していません。GitHub Pagesへそのまま配置できる相対パスの静的構成です。

## Architecture

| パス | 責務 |
| --- | --- |
| `index.html` | タイトル、チュートリアル、ゲームHUDの静的な画面構造 |
| `styles.css` | レスポンシブ配置、状態別UI、短い画面演出 |
| `astra.css` | 改装版の配色・文字組み・画面構成と状態別演出 |
| `title-art.js` | ゲーム状態から独立したCanvasタイトル図。非表示時は描画を停止 |
| `config.js` | Wave、弾幕、入力、描画、音響の調整値とWave定義 |
| `simulation.js` | DOMに依存しないゲーム状態、TIME STOP、ルート・TARGET判定、EXECUTE、敵弾、衝突、Wave進行 |
| `game.js` | マウス・キー・MOVE PAD入力、固定時間ゲームループ、DOM更新、シミュレーションイベントの振り分け |
| `renderer.js` | シミュレーション状態を変更しないCanvas描画と視覚効果 |
| `audio.js` | Web Audio APIによる合成SE、音量設定、AudioNodeの寿命管理 |
| `assets/` | 正式ロゴなど、リポジトリ内で配信する静的素材 |
| `tests/` | Nodeロジックテストと実Chromeによる操作・描画・負荷検証 |

入力は`game.js`でゲーム座標へ変換され、`simulation.js`だけがゲーム状態を更新します。シミュレーションが発行した意味単位のイベントを`game.js`がUI・音・短命な演出へ渡し、`renderer.js`はその状態を読み取って描画します。この境界により、ゲームルールをブラウザAPIなしでテストできます。

## 素材・クレジット

- 既存ロゴ: プロジェクト提供の透過PNGを保存。改装版のタイトル・ヘッダーはローカル書体の文字組み
- タイトルの図: Vanilla JavaScript / Canvasによるオリジナルの経路・目盛り表現
- キャラクター、敵、弾、エフェクト: Canvasによる図形表現
- 効果音: Web Audio APIによる実行時合成
- 外部画像・音声素材: なし

本リポジトリにはライセンスファイルを含めていません。

## Testing

ロジックテストはブラウザAPIから独立した`simulation.js`を対象にしています。

- `simulation.test.cjs` — TIME STOP、ルート、TARGET、EXECUTE、衝突の基本契約
- `loop.test.cjs` — ゲージ、キャンセル、UNDO / CLEAR、リトライ、特殊射撃の状態遷移
- `barrage.test.cjs` — 射撃パターン、弾数上限、寿命、画面外破棄
- `waves.test.cjs` — 10 Wave、ONE STOP、スコア復元、任意の時間制限倍率

`*-browser.cjs`と`browser.cjs`は、Playwrightを検証用ドライバーとしてローカルのGoogle Chromeを操作し、PC・タッチ相当の入力、レスポンシブ表示、Canvasの実ピクセル、Web Audio、180弾負荷、コンソールエラーを確認します。Playwrightはゲーム本体の実行依存ではなく、配信ページから読み込まれません。

```sh
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs
node tests/browser.cjs
node tests/tutorial-touchpad-browser.cjs
node tests/astra-browser.cjs
```

確認済みviewportは1280×720 / 768×800 / 430×860 / 390×844 / 360×800 / 320×800 / 844×390です。全検証の対象、コマンド、結果、物理端末で残る確認事項は[VERIFICATION.md](VERIFICATION.md)に記録しています。

物理スマートフォンでの性能・操作・端末スピーカーの聴感、およびコンテスト主催者の最新規約本文との照合は別途確認が必要です。
