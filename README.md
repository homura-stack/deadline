# DEAD/LINE

### 次世代絶望導体により沈黙した極微回路社会において、最後の灯火となったあの超高速電子蛍について

> **弾幕を避け、世界を止め、瞬間移動し、最後は残光だけが残る。**

**『DEAD/LINE 次世代絶望導体により沈黙した極微回路社会において、最後の灯火となったあの超高速電子蛍について』**は、弾幕回避と時間停止中のルート設計を組み合わせたブラウザアクションゲームです。

機械生命体の電子ホタル「Pico」を操作し、沈黙した回路都市に光を取り戻します。

## ▶ PLAY

**https://homura-stack.github.io/deadline/**

インストール不要。PC・タッチ操作に対応しています。

---

## GAMEPLAY

### EVADE

通常時間では、Picoを操作して敵弾を回避します。

ただ逃げ続けるだけではありません。敵弾のすぐそばをかわす **NEAR MISS** に成功すると、TIME STOPゲージが大きく上昇します。

危険へ踏み込むほど、より早く時間を止められます。

### TIME STOP

ゲージが満タンになったら時間停止。

敵も、弾丸も、すべて静止します。

ここからは反射神経ではなく、突破ルートを考える時間です。

### DRAW & LOCK

止まった弾幕の中に、Picoが駆け抜けるルートを描きます。

敵をルート上に通すことで **LOCK**。弾に触れる危険な区間は赤く表示されるため、敵を狙いながら安全な突破口を探します。

### EXECUTE

ルートを決めたら **EXECUTE**。

Picoが描いた線を一瞬で駆け抜け、LOCKした敵を連続撃破します。

**TIME STOP → DRAW → LOCK → EXECUTE**

避けるアクションと、止まった世界で考えるルート設計。そして、考えた作戦が一瞬で実行される爽快感。

それがDEAD/LINEの基本ループです。

---

## CONCEPT

**弾幕を避け、世界を止め、瞬間移動し、最後は残光だけが残る。**

そんな、気持ちよくてかっこいいゲームを作るところから『DEAD/LINE』は始まりました。

通常時間では敵弾をかわし、危険なNEAR MISSを狙う。

時間を止めたら、静止した弾幕の中に突破ルートを描く。

そしてEXECUTEした瞬間、Picoが描いた軌跡を一気に駆け抜ける。

**「避ける」「考える」「一気に解放する」。**

その切り替わりと、一瞬の爽快感をゲームの中心にしています。

---

## HOW TO PLAY

初回プレイではTRAININGが始まります。

実際に操作しながら、**EVADE → NEAR MISS → TIME STOP → DRAW → EXECUTE** を順番に体験できます。

### PC

| 操作 | キー |
| --- | --- |
| Pico移動 | マウス |
| TIME STOP | SPACE |
| ルート描画 / LOCK | マウスドラッグ |
| EXECUTE | SPACE |
| UNDO | Z |
| CLEAR | X |
| CANCEL | C / Escape |
| RETRY | SPACE / Enter |

### TOUCH

画面下部のMOVE PADと各操作ボタンを使用します。

---

## WORLD

沈黙した回路都市は5つのAREAに分かれています。

| AREA | Wave |
| --- | ---: |
| GARDEN / 蛍庭区 | 1–2 |
| FORGE / 機関区 | 3–4 |
| CANAL / 電流水路区 | 5–6 |
| SKYLINE / 天蓋区 | 7–8 |
| CORE / 中央核 | 9–10 |

全10Wave。

AREAを攻略すると回路に光が戻り、次のAREAが解放されます。復旧済みAREAにはWORLD MAPから再挑戦できます。

ゲームの進行状況はブラウザに自動保存されます。AREAの途中で終了した場合は、そのAREAの最初のWaveから再開します。

---

## DEVELOPMENT

ZEN大学 Webページコンテスト応募作品として制作しました。

ゲーム本体は以下のWeb標準技術で実装しています。

- HTML
- CSS
- JavaScript
- Canvas
- Web Audio API

**ゲーム本体に外部JavaScriptライブラリは使用していません。**

SEは音声ファイルを再生するのではなく、Web Audio APIを使ってゲーム実行中に生成しています。

ビルド工程やサーバーサイド処理はなく、GitHub Pages上でそのまま動作します。

### 主なファイル

- `simulation.js` — 戦闘・衝突・Wave進行
- `game.js` — 入力・ゲーム進行
- `renderer.js` — Canvas描画
- `audio.js` — サウンド
- `journey.js` — AREA進行・セーブ
- `world-map.js` — WORLD MAP

---

## TESTING

ゲームロジックとブラウザ上の動作について、自動回帰テストを用意しています。

- **Node：110 / 110 PASS**
- **Chrome：26 / 26 PASS**

TRAINING、全10Wave、ENDING、セーブ・再開、AREA再挑戦、PC・タッチ操作などを検証しています。

より詳しい技術資料：

- [Audio Design](docs/AUDIO_DESIGN.md)
- [Wave 7 Test Investigation](docs/WAVE_7_TEST_INVESTIGATION.md)

---

## PLAY

### ▶ https://homura-stack.github.io/deadline/

ブラウザからすぐに遊べます。
