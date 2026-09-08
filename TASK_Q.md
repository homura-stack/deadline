# TASK Q — Persistent Progress Save / Continue

## 1. セーブ形式とkey

`localStorage` の **`deadline.progress.v1`** を使用。既存の `journey.js` に進行チェックポイントの保存窓口を追加した。
外部ライブラリ・別の保存方式・migration framework・セーブ削除UIは追加していない。

```json
{
  "version": 1,
  "restored": 2,
  "run": {
    "score": 4850,
    "maxChain": 5,
    "totalKills": 16,
    "perfectExecutions": 0,
    "hitsTaken": 0,
    "time": 21
  }
}
```

上は形式例。`restored` は従来どおり、先頭から連続して復旧したAREA数（整数0〜5）。
`run` はそのAREA攻略確定時点の累計値。既存のマップスコア・ENDING集計の連続性と、再開後の二重加算防止のため保持する。
新しいハイスコア／AREA別ランキングではない。

## 2. 保存対象と導出対象

| 保存する情報 | 用途 |
|---|---|
| `version` | 形式判定。現在は1のみ |
| `restored` | 復旧／解放／進行位置のSingle Source of Truth |
| `run`の6値 | スコア・統計・累計時間をAREA境界へ復元 |

- 現在地Pico／現在AREA: `Math.min(restored, 4)`。Picoの既存算出処理は変更しない。
- 解放AREA: 既存の `journey.status()` で導出。復旧済みAREAは再挑戦可能。
- 再開Wave: 未攻略AREAの最初のWave。`restored=0/1/2/3/4` に対し `1/3/5/7/9`。
- 全クリア: `restored===5`。ENDING表示済みフラグや同義の `completed` は重複保存しない。
- 中間Waveの到達履歴は保存しない。再開に必要なAREA境界のみを保持する。
- 選択カーソル・敵／弾座標・ルート・ゲージ・HP・Wave内の失敗回数／救済選択等は保存しない。

## 3. 既存保存との共存

| key | 内容 | TASK Qでの変更 |
|---|---|---|
| `deadline.tutorial.v1` | TRAINING受講状態（`completed`等の文字列） | なし |
| `deadline.audio.v1` | MASTER / SFX / mute | なし |
| `deadline.controls.v1` | タッチ感度 | なし |
| `deadline.progress.v1` | AREA確定チェックポイント | 追加 |

TRAINING受講・音量・タッチ設定は二重保存しない。既存キーの削除・形式変更なし。
導入前に保存されていなかった進行は遡って復元できない。更新版を読み込んでから確定したAREAが保存対象になる。
保存は同じブラウザプロファイル・同じ保存元で有効。HTTP(S)とローカルファイル、別ブラウザ／端末では共有されない。
ブラウザデータ削除・プライベートモード終了等による保存消失の対策やクラウド同期は今回の対象外。

## 4. 保存タイミング

1. 本編AREA最終Waveの撃破が確定し、既存 `journey.cleared()` が成功した瞬間。
   復旧演出中の誤reloadでも攻略を失わないよう、この時点で次の `restored` を保存する。
2. 復旧演出完了／次AREA解放後のマップ表示。
3. WORLD MAPへ正常復帰した時。
4. ENDING到達時。

同じAREA境界の繰り返し通知は書き込まない。選択・ホバリング・通常のフレーム更新では保存しない。
保存済みの進行を下位AREAで上書きせず、旧タブの古いチェックポイントにも後退防止を行う。
容量不足等の書き込み失敗時はページ内チェックポイントを保持し、次の安全な保存通知時だけ再試行する。

## 5. 起動・START・再開

- 起動時に保存データを検証して読み込み、進行と確定済み累計値を復元する。
- TRAINING完了済みのSTARTは、その進行のWORLD MAPへ進む。
- 初回／TRAINING未完了は、従来どおりSTART → TRAINING → WORLD MAP。受講内容は変更しない。
- タイトルからTRAININGを再受講しても、復元済みの本編world／journeyを一時退避し、終了時に元へ戻す。
- マップでは保存されたAREAクリア境界の静止worldを用意し、ENTER時に既存の次Wave遷移を使用する。
  Wave 7再開時のONE STOP説明も既存のWave 6→7遷移で表示する。
- 復旧済みAREAやカーソル表示は既存描画へ復元済み `journey.restored` を渡すだけ。画像／CSSは変更しない。

## 6. 戦闘途中で閉じた場合

**そのAREAの最初のWaveから再挑戦**する。
例: FORGEのWave 4途中で閉じる → START → FORGE解放済みWORLD MAP → ENTER FORGE → Wave 3。

GARDEN確定時のスコア・統計へ戻し、未確定のWave 3／4分は持ち越さない。
これにより途中Waveの報酬だけを残して再取得する二重加算を防ぐ。
敵・弾・ルート等は通常のWave生成に任せる。Wave内の失敗回数／救済選択は新しいAREA挑戦として初期状態。
同一セッション内の通常GAME OVER→同Wave RETRYと救済ルールは変更していない。

## 7. 過去AREA再挑戦

- 既存 `areaReplayReturn` による本編world／journeyの退避と完全復元を維持。
- 再挑戦・TRAINING中の一時worldは保存窓口で除外し、`journey.replay` も保存側で拒否する。
- 再挑戦途中にreloadしても、保存された本編進行から再開する。
- 再挑戦完了後も進行・累計スコア・Pico現在地は後退しない。

## 8. ENDING後と既存RESTART

既存の復旧／SYNC／ENDING演出は維持する。
最後のAREA攻略確定で `restored=5` を保存するため、その後の再起動では全AREA復旧済みの通常WORLD MAPへ進む。
ENDINGを自動で繰り返さず、全AREAの再挑戦が可能。PicoはCOREに表示する。

従来の「タイトル復帰・RESTARTで全進行初期化」は、保存済みチェックポイントへの復帰に統一した。
ENDINGの既存RESTARTボタンは、実際の移動先に合わせ **WORLD MAP** へ文言変更。
マップの「タイトルに戻ると最初から」の古い注意文も自動保存の説明へ訂正した。
新しいNEW GAME／削除UIは追加していない。レイアウト・タイトル画面・HUDは変更なし。

## 9. 破損・利用不可時

- JSON失敗、version不一致、必須フィールド欠落、不正なAREA数、負数／非数値／非有限の累計値等は無効とする。
- 有効なフィールドだけを取り出し、未検証のオブジェクトをゲームworldへ展開しない。
- 無効データの起動時はGARDEN・累計0へ安全にフォールバック。次の正常なマップ保存で有効形式になる。
- 読込だけで不正データを削除しない。既存のTRAINING／Audioキーも触らない。
- localStorage利用拒否・容量不足で例外を外へ出さず、ページ内の進行を維持する。
  **保存が利用できない環境では、ページを閉じた後の永続性は保証できない。**

## 10. 変更ファイル

TASK O以前の未コミット差分とは区別したTASK Qのみの一覧。

- `journey.js` — version付きチェックポイント、検証、保存重複／後退防止、storage例外対応
- `game.js` — 安全な保存通知と起動／START／タイトル復帰時のチェックポイント復元
- `index.html` — 既存のマップ注意文とENDINGボタン文言のみ
- `tests/progress.test.cjs`（追加）
- `tests/progress-browser.cjs`（追加）
- `tests/world-map-browser.cjs`
- `tests/restoration-browser.cjs`
- `tests/ui-polish-browser.cjs`
- `tests/official-visual-browser.cjs` — fixtureのreload説明を新仕様に合わせる（検証維持）
- `tests/official-visual.test.cjs` — 新規状態とreloadを混同しないテスト名へ訂正
- `TASK_Q.md`（追加）

作業開始時のハッシュとの比較で、本番変更は上記3ファイルだけ。
`config.js` / `simulation.js` / `audio.js` / `renderer.js` / `tutorial.js` / `world-map.js` と全CSSは同一。
`index.html` の変更は説明文2箇所に限定し、タイトル画面・HUD・画像参照は変更していない。

## 11. テスト

- 新規Node保存回帰: **5 / 5 PASS**。TDDで未実装時の失敗を確認してから実装。
- 全Node: **105 / 105 PASS**。
- Chrome全26本: 初回 **25 / 26 PASS**。保存・再開関連と実AREA再挑戦／ENDING回帰はPASS。
  `wave-k-browser.cjs` がWave 7で `No safe approach to a Wave enemy`。TASK O以前にも同じ失敗記録あり。
  無変更で1回再実行したが、Wave 1〜6 PASS後、Wave 7の同じ探索箇所で再失敗した。
  Wave設定・シミュレーション・自動経路探索のファイルは作業開始時と同一。今回との因果関係／探索失敗の根本原因は未確定で、全Chrome PASSとはしていない。
  今回の対象外である難易度や探索条件を変えてPASSさせることは行っていない。
- 専用Chromeで、PC／タッチ相当の保存済みSTART、マップ／戦闘／再挑戦中reload、Pico、Wave 7説明、Audio／TRAINING共存、破損データを検証。
- 実入力・通常設定のGARDEN攻略 → 復旧演出中reload → FORGE Wave 4途中reload → Wave 3から再挑戦 → FORGE攻略 → reload → CANAL開始を検証。
- 既存の実AREA再挑戦テストへ、保存内容の不変とreload後の本編位置を追加。
- 既存の全10Wave／ENDINGテストへ、クリア保存とreload後の全復旧・再挑戦可能状態を追加。
- 専用Chromeプロファイルでブラウザ終了／再起動と `file://` 再開も検証。ユーザーのブラウザプロファイルは使用しない。
- ログ: `tests/artifacts/task-q/`。既存テストを削除してPASSさせていない。
- `node --check` と `git diff --check` はPASS。ステージングなし。

## 12. 人間が確認する項目（最大5）

1. いつものURL／ローカルファイル・ブラウザでAREA攻略後に閉じ、翌回STARTで同じ現在地へ戻るか。
2. AREA後半Waveでreloadした際、そのAREA先頭へ戻る範囲とスコアの扱いが分かりやすいか。
3. 過去AREA再挑戦中／終了後のreloadでも、本編の復旧状況とPico位置が保たれるか。
4. ENDING後のSTARTとWORLD MAPボタンから、全復旧マップで再挑戦できるか。
5. 実機タッチでの再開と、TRAINING完了・音量・muteが併存して保持されるか。

commit / push / staging / ファイル削除は行っていない。
