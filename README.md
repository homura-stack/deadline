# DEAD/LINE

> 弾幕を避け、世界を止め、瞬間移動し、最後は残光だけが残る。

**『DEAD/LINE 次世代絶望導体により沈黙した極微回路社会において、最後の灯火となったあの超高速電子蛍について』**は、弾幕回避と時間停止中のルート設計を組み合わせたブラウザアクションゲームです。

## [▶ PLAY](https://homura-stack.github.io/deadline/)

インストール不要。PC・タッチ操作に対応しています。

## ゲーム概要

機械生命体の電子ホタル「Pico」を操作し、沈黙した回路都市に光を取り戻します。

1. **EVADE / NEAR MISS** — 敵弾を避け、至近距離をかわしてTIME STOPゲージを増やす。
2. **TIME STOP** — ゲージが満タンになると敵と弾丸を停止する。
3. **DRAW / LOCK** — 静止した弾幕の中に突破ルートを描き、通過する敵をLOCKする。
4. **EXECUTE** — Picoがルートを一気に駆け抜け、LOCKした敵を連続撃破する。

反射神経で「避ける」時間と、安全な軌道を「考える」時間、その作戦を一瞬で「解放する」切り替わりが基本ループです。弾に触れる危険な区間は赤く表示されます。

## 操作

初回プレイではTRAININGが始まり、実際の操作で **EVADE → NEAR MISS → TIME STOP → DRAW → EXECUTE** を体験できます。

### PC

| 操作 | キー・入力 |
| --- | --- |
| Pico移動 | マウス |
| TIME STOP / EXECUTE | Space |
| ルート描画 / LOCK | マウスドラッグ |
| UNDO | Z |
| CLEAR | X |
| CANCEL | C / Escape |
| RETRY | Space / Enter |

### Touch

画面下部のMOVE PADでPicoを移動し、TIME STOP、EXECUTE、UNDO、CLEAR、CANCELは画面上の操作ボタンを使います。

## WORLD・全10Wave・セーブ

回路都市は5つのAREA、全10Waveで構成されています。

| AREA | Wave |
| --- | ---: |
| GARDEN / 蛍庭区 | 1–2 |
| FORGE / 機関区 | 3–4 |
| CANAL / 電流水路区 | 5–6 |
| SKYLINE / 天蓋区 | 7–8 |
| CORE / 中央核 | 9–10 |

AREAを攻略すると回路に光が戻り、次のAREAが解放されます。復旧済みAREAにはWORLD MAPから再挑戦できます。

進行状況はブラウザのlocalStorageへ自動保存されます。AREAの途中で終了した場合は、そのAREAの最初のWaveから再開します。

## 技術構成

HTML、CSS、JavaScript、Canvas、Web Audio APIで構成した静的Webゲームです。ゲーム本体に外部JavaScriptライブラリ、ビルド工程、サーバーサイド処理はなく、GitHub Pagesからそのまま配信できます。効果音は音声ファイルではなく、Web Audio APIで実行時に合成します。

主なモジュール：

- `simulation.js` — 戦闘、衝突判定、Wave進行
- `game.js` — 入力とゲーム進行
- `renderer.js` — Canvas描画
- `audio.js` — 効果音の合成と出力制御
- `journey.js` — AREA進行とセーブ
- `world-map.js` — WORLD MAPの表示と復旧状態

技術資料：

- [素材仕様・クレジット](docs/ASSETS.md)
- [音響設計](docs/AUDIO_DESIGN.md)
- [経路探索テスト仕様](docs/ROUTE_PLANNER.md)

## テスト

Nodeのロジックテストと、Playwright / Chromeによるブラウザ回帰テストを収録しています。TRAINING、全10Wave、ENDING、セーブ・再開、AREA再挑戦、PC・タッチ操作、画像読み込み失敗、reduced motionなどを検証します。

```powershell
node --test (Get-ChildItem tests\*.test.cjs | ForEach-Object FullName)
python -m http.server 4186 --bind 127.0.0.1
# 別のターミナルで実行
node tests/run-browser-suite.cjs
```

確認済みの結果：Node 110 / 110、Chrome 26 / 26。

## 素材クレジット・生成手段・ライセンス

WORLD MAPの`before.jpeg`と`after.jpeg`は、画像生成ツールとしてGeminiを使用しています。敵キャラクター画像は集合画像から背景を除去し、透過PNGへ分割した派生素材です。各画像の寸法、SHA-256、描画仕様と詳細な来歴は[素材仕様・クレジット](docs/ASSETS.md)に記載しています。

生成AI利用が記録されている素材は上記WORLD MAP画像です。そのほかの素材については、生成手段や第三者ライセンスの記録がリポジトリ内にありません。

## コンテスト・作者・ライセンス

- ZEN大学 Webページコンテスト応募作品
- 作者: [homura-stack](https://github.com/homura-stack)
- ライセンス: 明示的なオープンソースライセンスは設定していません。コード・画像の再利用条件は作者へ確認してください。
