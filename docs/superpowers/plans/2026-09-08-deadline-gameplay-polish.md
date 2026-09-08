# TASK J — DEAD/LINE Gameplay Polish Pass 実装計画

## 目的と非変更範囲

通常時間で回避 → TIME STOP → DRAW → LOCK → EXECUTE という核を維持し、既存の `config.js`、DOMなしの `simulation.js`、表示層の `game.js` / `renderer.js` / `audio.js`、既存TRAINING・WORLD MAPを小さく拡張する。Wave構成、ニアミス判定半径、TIME STOPコスト、ルート判定、外部依存、画像素材は変更しない。

## 調査で確認した共通原因

1. ニアミスは `simulation.js` の `graze()` 内でゲージを加算するだけで、意味イベントを表示・音・TRAININGが購読できない。
2. TRAININGは無敵状態かつMOVE完了直後にゲージを満タンにするため、ニアミスを体験できない。
3. 被弾時は `failed` とGAME OVER DOM表示が同一更新で成立し、既存damage SE・shake・flashを見る前に結果画面が覆う。
4. TRAINING完了状態は保存済みだが、タイトルのSTART分岐が常にTRAININGへ固定されている。
5. WORLD MAPは復旧済みAREAを `online` と識別できる一方、`enter()` が `available` だけを許可し、再挑戦用のキャンペーン状態退避がない。
6. aimとfanは同じenemy02画像を使い、小さいfan目印しか差がない。弾自体はpattern別の色・形を既に持つ。
7. LOCK、EXECUTE、通常撃破、最後の撃破、PERFECTには既存の差があるが、PLAYER DEATHの認識時間だけが欠け、階層が潰れている。

## 依存関係と実装順序

### 1. パラメータ契約と失敗テストを先に更新

**対象:** `config.js`, `tests/loop.test.cjs`, `tests/tutorial.test.cjs`, `tests/journey.test.cjs`

- passive recoveryは試作10/secから15/secへ戻し、初期20から待機のみで約5.33秒にする。
- near miss bonusは試作+14から+16へ上げ、1回で待機約1.07秒分の価値を持たせる。
- initial 20、max 100、nearMissRadius 32、cost 100、cancelCost 40は維持する。
- feedback値としてnear-miss表示時間・連続音間隔、death hit stop 0.10秒・結果表示待ち時間を `config.js` に集約する。
- 先にNodeテストへ期待値・nearMissイベント・再挑戦入口を記述し、意図した失敗を確認する。

**回帰リスク:** 固定ステップ期待値、ブラウザの充電待機timeout。時間の直書きを回復値から算出するテストへ寄せる。

### 2. ニアミスを意味イベントへ昇格

**対象:** `simulation.js`, `game.js`, `audio.js`, `renderer.js`, `index.html`, `styles.css`, `ui-polish.css`

- 実際に増えた量を含む `nearMiss` イベントを1弾1回だけ発行する。
- 表示層に短命なnear-miss状態を追加し、ゲージ発光、`NEAR MISS +16`、Pico周辺の小リング、短い専用SEを同期させる。
- 連続入力は表示を置換し、chainだけを増やす。SEは最小間隔とpitch上限を設け、DOMや音声を積み上げない。
- 上限付近では実増加量を表示し、満タン後の0加算を成功扱いしない。

**依存:** 1のconfigとイベントテスト。

**回帰リスク:** 高密度弾幕での音・表示飽和、Canvas視認性、reduced motion。短命の単一状態と既存上限で抑える。

### 3. TRAININGへ安全なニアミス体験を追加

**対象:** `config.js`, `game.js`, `renderer.js`, `index.html`, `tests/tutorial*.cjs`, `tests/pico-tutorial-browser.cjs`, `tests/title-*.cjs`

- 4ページBRIEFINGは増やさず、EVADE説明に「敵弾の近くをかわすと大きく充電」「危険へ踏み込むほど早く止められる」を短く追記する。
- 実地TRAININGを MOVE → NEAR MISS → FREEZE → DRAW → EXECUTE の5段階にする。
- MOVE完了時に現在位置基準の制御弾と安全な通過ガイドを置く。ニアミス成功時だけゲージを満たしてFREEZEへ進める。
- 練習被弾は死亡させず同じニアミス課題を再配置する。キャンペーンの判定半径は触らない。

**依存:** 2のイベント。

**回帰リスク:** マウス／タッチ補助の既存helper、練習無敵処理、完了保存。両入力の実ブラウザ経路を更新する。

### 4. 被弾からGAME OVERまでの認識シーケンス

**対象:** `config.js`, `game.js`, `renderer.js`, `styles.css`, `tests/ui-polish-browser.cjs`, `tests/browser.cjs`

- simulationの即時失敗判定は維持し、表示層だけに `deathFx` を設ける。
- 被弾フレームでPicoを白フラッシュし、0.10秒の表示用ヒットストップ中は世界・粒子・shakeの減衰を止める。
- その後にdamage SE、shake、damage flash、Picoの縮小／破裂リングを読ませ、短い待ち時間後にGAME OVERを表示する。
- 待ち時間中のRETRY入力は1回だけ予約し、最短許可時点で同Waveを再開する。GAME OVER後の既存SPACE／ボタンは即時のままにする。

**依存:** 1のdeath feedback値。

**回帰リスク:** 結果モーダルfocus、連打、タッチ、reduced motion、既存damage音の二重再生。

### 5. START導線を保存状態で分岐

**対象:** `game.js`, `tutorial.js`（互換確認のみ）, `tests/title-routes-browser.cjs`, `tests/tutorial-entry-browser.cjs`

- `trainingPreference.shouldOffer()` がtrueなら従来通りTRAINING、completedなら既存キャンペーン初期MAPへ直接遷移する。
- 独立TRAININGボタンは常に再受講可とし、完了・中断とも退避したキャンペーンを復元する。
- 既存キー `deadline.tutorial.v1` と `started` / `skipped` / `completed` の解釈は変更しない。

**依存:** 3のTRAINING完了フロー。

**回帰リスク:** 完了済みテストhelperが「START→TRAINING」を仮定している。共通helperを新導線へ更新する。

### 6. 復旧済みAREAを進行非破壊で再挑戦

**対象:** `simulation.js`, `journey.js`, `game.js`, `world-map.js`, `tests/journey.test.cjs`, `tests/world-map-browser.cjs`

- `createWorld(startWaveIndex)` を後方互換の任意引数として追加し、AREA先頭Waveの再挑戦世界を作れるようにする。
- `journey.enter()` は明示したreplay時のみ `online` を許可し、通常のavailable進行条件は維持する。
- game表示層で本編 `world` / `journey` を退避し、復旧済みAREAの2Waveだけを別世界で実行する。AREA末尾CLEARで退避状態へ戻りMAPを表示する。
- replay中は `journey.cleared()` による復旧処理を発火させず、score・restored・unlockFrom・次AREAを一切書き換えない。
- RESTARTはreplayを破棄して退避MAPへ戻す。locked AREAは従来通り入れない。

**依存:** 4のretry/reset後処理、5のMAP入口。

**回帰リスク:** Wave遷移、Area末尾復旧、最終AREA同期、再挑戦中の死亡とretry。Node状態遷移とChromeの実経路を両方確認する。

### 7. 敵タイプ識別を既存描画で補強

**対象:** `renderer.js`, `tests/battle-visual-browser.cjs`

- 既存画像は変更せず、enemy本体の近傍にpattern別の小型シルエット記号を描く。
- aim=単一照準、fan=三方向、burst=同心パルス、rotate=回転軌道、delay=予告三角を色だけでなく形でも区別する。
- TIME STOPの暗色パレットでも輪郭が残り、弾・Pico・ルートを覆わない大きさにする。

**依存:** なし。描画回帰を他の演出変更後にまとめて確認する。

**回帰リスク:** 同じenemy02を使うaim/fan、スマホ縮小、高密度Waveのノイズ。

### 8. イベント演出階層をconfigで明示

**対象:** `config.js`, `game.js`, `renderer.js`, `audio.js`, `tests/execute-feedback-browser.cjs`

- 通常LOCKは局所パルス、EXECUTE開始は広がる放出、通常撃破は局所slash、最後の敵はより長いhit stop／shake／金色ring、PERFECTは完了後のcallout、DEATHは白→赤の固有シーケンスとする。
- 既存hitStop budgetは維持しつつ、finalHitStopだけを少し強める。全画面フラッシュは死亡以外で増やさない。
- 音量・shake・表示時間はすべて既存feedbackオブジェクトに保持する。

**依存:** 4のdeath hierarchy、7の描画ノイズ確認。

**回帰リスク:** EXECUTEテンポ、Wave clearとの競合、画面揺れ過多。

### 9. 上手いプレイの褒め方を最小実装

**対象:** `game.js`, `index.html`, `styles.css`, 関連ブラウザテスト

- 今回は実測できるconsecutive near missesを `NEAR MISS ×N` として即時評価する。
- ALL TARGETは既存全LOCK表示、ALL CLEAR / PERFECTは既存doneイベントを維持し、8で階層を明確化する。
- dangerous route、efficient route、no undo、last-second successは定義が現状データにないか、安全ルート設計という核と衝突し得るため新スコア化しない。完了報告に将来案だけ記す。

**依存:** 2と8。

**回帰リスク:** 根拠の弱い称賛やスコア膨張を避ける。

### 10. 全回帰検証と差分監査

**対象:** 全変更ファイル、既存Node／Chrome tests

- focused Node: gauge/near miss、tutorial、journey、simulation。
- focused Chrome: near-miss表示、TRAINING、completed START、death/retry、WORLD MAP replay、enemy識別、EXECUTE hierarchy。
- 全Node 79件以上を実行する。
- 既存Chromeの全スクリプトを実行可能な範囲で実行し、既知の自動回避ルート揺らぎはソース回帰と区別して報告する。
- `node --check`、`git diff --check`、`git status --short`、差分の変更対象監査を行う。
- ファイル削除、外部依存追加、画像追加、commit、pushがないことを確認する。

## 変更見込みファイル

- 実装: `config.js`, `simulation.js`, `game.js`, `renderer.js`, `audio.js`, `journey.js`, `index.html`, `styles.css`, `ui-polish.css`
- テスト: `tests/loop.test.cjs`, `tests/tutorial.test.cjs`, `tests/journey.test.cjs`, `tests/tutorial-helpers.cjs`, `tests/title-routes-browser.cjs`, `tests/tutorial-entry-browser.cjs`, `tests/tutorial-touchpad-browser.cjs`, `tests/world-map-browser.cjs`, `tests/ui-polish-browser.cjs`, `tests/battle-visual-browser.cjs`, `tests/execute-feedback-browser.cjs`, `tests/browser.cjs`, `tests/restoration-browser.cjs`（必要な期待値・helperのみ）
- 計画: 本ファイル

## 完了条件

- 10項目のうち必須1〜9（9は最小範囲）が既存設計内で動作し、見送る細目は根拠を明記する。
- ゲームの核、Wave構成、判定半径、TIME STOPコスト、セーブキー、既存素材が維持される。
- Node全PASS。Chromeは全実行結果と、もし残るなら再現性を含む失敗を分離報告する。
- 人間の次回プレイテスト項目を5件以内に絞る。
