# DEAD/LINE

**通常時は耐える。時間停止中は考える。解除すると一瞬で支配する。**

DEAD/LINEは、敵弾を避けてTIME STOPゲージを溜め、停止した世界に一筆書きの攻撃ルートを描く10 Waveのブラウザアクションゲームです。SPACEで実行すると、自機だけが描いた線を超高速で移動し、ロックした敵を順番に撃破します。

## プレイ

- 公開URL: https://homura-stack.github.io/deadline/
- 対応環境: PC版Google Chrome / スマートフォン版Google Chrome
- ビルド・インストール: 不要

## 操作方法

| 操作 | PC | スマートフォン |
| --- | --- | --- |
| 自機移動 | ゲームフィールド内でマウス移動 | 画面下のMOVE PADをドラッグ |
| TIME STOP | ゲージ満タン時にSPACE | TIME STOPボタン |
| ルート描画 | ドラッグ | ドラッグ |
| UNDO | Z | UNDOボタン |
| CLEAR | X | CLEARボタン |
| CANCEL | C | CANCELボタン |
| EXECUTE | SPACE | EXECUTEボタン |
| Waveリトライ | SPACE | RETRY WAVEボタン |

タイトル画面のSTARTまたはSPACEで、EVADE / FREEZE / DRAW / EXECUTEの4ページBRIEFINGへ進みます。最後のBEGIN TRAINING後は、移動・時間停止・2体TARGET・EXECUTEを実際に試す安全なPRACTICEを経てWave 1を開始します。SKIP TUTORIALも選択でき、リトライ時はチュートリアルを再表示しません。

スマートフォンのMOVE PADは指の移動量で自機を相対移動します。小さなドラッグは精密に、大きなドラッグは素早く反応し、TIME STOP中はLOCKEDになります。ゲームフィールド上のタッチは停止中のDRAW専用です。SETTINGSのTOUCH SENSITIVITY（50〜150%、初期100%）で感度を保存できます。

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

## ファイル構成

- `index.html` — 画面構造とHUD
- `styles.css` — レイアウト、レスポンシブ表示、画面演出
- `config.js` — Wave、弾幕、操作感、音響などの調整値
- `simulation.js` — ゲーム状態、敵攻撃、衝突、Wave進行
- `renderer.js` — Canvas描画
- `game.js` — 入力、UI、ゲームループ
- `audio.js` — Web Audio APIによる合成効果音
- `assets/logo-deadline.png` — 正式DEAD/LINEロゴ
- `tests/` — Node / Chrome検証スクリプト
- `VERIFICATION.md` — 詳細な検証記録と既知の制約

## 素材・クレジット

- 正式ロゴ: プロジェクト提供の透過PNG
- キャラクター、敵、弾、エフェクト: Canvasによる図形表現
- 効果音: Web Audio APIによる実行時合成
- 外部画像・音声素材: なし

本リポジトリにはライセンスファイルを含めていません。

## 検証

Nodeロジックテスト、PC Chrome、スマートフォン相当のタッチ操作、1280×720 / 768×800 / 430×860 / 390×844 / 360×800 / 320×800 / 844×390のレスポンシブ表示、180弾負荷を確認しています。詳細な結果と実行コマンドは[VERIFICATION.md](VERIFICATION.md)を参照してください。

物理スマートフォンでの性能・操作・端末スピーカーの聴感、およびコンテスト主催者の最新規約本文との照合は別途確認が必要です。
