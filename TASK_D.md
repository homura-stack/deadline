# DEAD/LINE 世界観刷新 TASK D

実施日：2026-09-06。正式背景10枚、ホタル式LIGHT RESTORED、WORLD MAP同期発光、エンディング。

## Git安全確保

| 項目 | 作業開始時 |
| --- | --- |
| branch | `codex/deadline-world-map` |
| HEAD / TASK C / 今回のparent | `bf13bf8950eac8ebb718a4a2ecbd818343ed36d7` |
| TASK B | `30496249392205ca6f84b0743ff9b73cfbcb48bf` |
| status | clean |
| staged / unstaged / 未追跡 | すべてなし（ignore対象を除く） |
| C / B祖先確認 | 両方の `merge-base --is-ancestor` がexit 0 |
| 保護branch | `backup/deadline-task-c-before-d-20260906` |
| TASK D branch | `codex/deadline-light-restoration` |
| remote | `origin` = `https://github.com/homura-stack/deadline.git` |
| merge / push | 未実施 |

コード変更前に `D:\Desktop\AIWorkSpace\backups\deadline-pre-task-d-20260906` へ全履歴bundleと181ファイルのZIPを保存。bundle verify、ZIP件数とCRC検証は合格。TASK A / B / C、アストラ版、mainの既存branchを保持しています。

## 正式背景

| AREA | WAVE | BEFORE | AFTER |
| --- | --- | --- | --- |
| GARDEN / 蛍庭区 | 1–2 | `garden_before.jpeg` | `garden_after.jpeg` |
| FORGE / 機関区 | 3–4 | `forge_before.jpeg` | `forge_after.jpeg` |
| CANAL / 電流水路区 | 5–6 | `canal_before.jpeg` | `canal_after.jpeg` |
| SKYLINE / 天蓋区 | 7–8 | `skyline_before.jpeg` | `skyline_after.jpeg` |
| CORE / 中央核 | 9–10 | `core_before.jpeg` | `core_after.jpeg` |

提供元 `D:\Desktop\DEADLINE` の完成素材を `assets/stages/` へそのままコピー。10枚合計26,169,191 bytes（約25 MiB）。元画像とのSHA-256一致を確認し、[manifest.json](assets/stages/manifest.json)に原寸とハッシュを記録しました。再生成・画像編集・変換・再圧縮はありません。

`stage-art.js` が縦横比を維持する中央coverで論理座標960×600へ配置。戦闘時のBEFOREだけ、Canvas上で14〜30%の暗い紺を重ね、Pico・黄金LINE・赤紫の敵弾・シアンTARGETを前面に残します。AFTERは戦闘中・TIME STOP・EXECUTE・地区内WAVE遷移には合成しません。

描画の色は既存の深紺 `#080c1b`、黄金 `#f4c565`、黄白 `#fff0b5`、安全情報のシアン `#8debf1`、電子自然の青緑 `#75bfb0` を継承。見出しImpact、操作/数値Consolas、日本語UIの既存書体を継承し、今回の個性はPicoから世界へ伝わる光に集約しています。

## ホタル式LIGHT RESTORED

各地区の2 WAVE目の既存 `waveClear` イベントから開始します。シミュレーションが既に敵を撃破し弾を消しているため、得点・LIFE・敵AIを追加で変更しません。プレゼンテーション上の残像・ヒット・フラッシュ・画面振動・予約済み最終コールアウト・SEはここで止めます。入力と戦闘時間も一時停止します。

| 区間 | 通常の4地区 | CORE |
| --- | --- | --- |
| 静かなBEFORE | 0〜0.45秒 | 同じ |
| Picoが少し暗くなり呼吸する光 | 0.45秒から | 同じ |
| Pico起点でAFTERを露出 | 1.45〜3.80秒 | 1.45〜4.75秒 |
| AFTER全体＋LIGHT RESTORED | 1.15秒保持 | 同じ |
| マップへ戻るまで | 計4.95秒 | 計5.90秒 |

- 起点はクリア時のPicoの実座標をコピー。後からマウスを動かしても変わりません。
- AFTERに `destination-in` の放射グラデーションマスクを適用。境界は約160論理pxの柔らかい帯で、近くは復旧済み、遠くはBEFOREのまま残ります。全画面クロスフェードではありません。
- 腹部寄りの小さな黄金haloを呼吸させ、境界付近の粒子は最大8個。背景内の光を尊重し、地区ごとに3箇所だけ小さく応答させます。
- 100%まで広がったときだけAFTERを全面不透明で描き、`LIGHT RESTORED` と `AREA名 / 日本語名` を表示します。
- TASK Cの線状回路を急に点灯する旧演出は置換しました。旧方式を並行表示しません。
- 低減モーションでは粒子・応答点を止め、通常地区2.6秒、CORE3.0秒に短縮。起点からの露出と完了表示の順序は維持します。

## WORLD MAP / SYNC / ENDING

通常の解禁順と5地区の状態は `journey.js` のまま。復旧した地区は小さく発光→少し弱まる→約2.7秒で安定、という呼吸をします。他の未復旧地区を点灯させません。
新しく繋がる回路は幅のある淡い光をぼかして染み込ませます。常時点灯するのは両端が復旧した区間だけです。

COREのAFTERを見せた後にWORLD MAPへ戻り、`synchronizing` 状態へ進みます。

1. 地区ごとにずれた光の周期で応答し、位相差を徐々に縮めます。
2. 揃った光を短く弱め、`SYNC` を表示します。
3. 全5地区と回路が同じ曲線でゆっくり明るくなります。全面白フラッシュ・爆発・長時間暗転はありません。
4. 完成したマップを約1.6秒保持し、右側の地区詳細欄にエンディングを表示。マップ全体を見せ続けます。

最終マップはエンディングまで8.4秒（低減モーションでは4秒）。エンディングには `DEAD/LINE`、指定の日本語コピー、`LIGHT THE DEAD CIRCUIT.`、最終得点、RESTART / TITLEを表示します。RESTARTは新しいGARDENからの旅、TITLEはタイトルへ戻ります。どちらもキーボード・クリックで操作できます。進行セーブや新規ゲームルールは追加していません。

## 画像準備・性能

- 最初にGARDENの2枚を読み込み、地区開始はBEFORE / AFTER両方のdecode完了まで待機。
- 戦闘に入ったら次地区の2枚を先読み。画像参照は現在・次地区の最大4枚を保持し、過去地区は解放可能にします。10枚全体を常時decodeして保持しません。
- JPEGのリサイズと暗さ調整は地区/描画解像度が変わるときだけ。現在地区のBEFORE・AFTER・マスク用Canvasを保持し、ピクセル密度は最大2倍。
- 元画像のdecode目安は4枚で約64.5 MiB、最大Canvas3枚で約26.4 MiB。これは画像画素からの概算で、ブラウザ全体の実測メモリ値ではありません。
- マップ表示中の戦闘Canvas更新は停止。マップが静止状態になった後は発光用のstyle更新も繰り返しません。
- 読み込みが遅いときは暗いエリア表示で待機。失敗/20秒超過時は「読み込みを再試行」とTITLEを表示し、操作不能にしません。
- 新しい外部ライブラリ・外部ランタイム依存はありません。

## 検証

Windows / Chrome 152.0.7977.82、既存の開発用Playwrightで検証。

- Node 67件PASS（既存の戦闘57件＋進行/表示10件）。
- 新規の実入力通しテスト：TITLE→GARDEN→FORGE→CANAL→SKYLINE→CORE→最終MAP→SYNC→ENDING→RESTART→GARDEN、PASS。
- 全10 WAVEで18400点・57体撃破・LIFE 1・被弾0を確認。各地区のBEFORE / AFTERを記録。
- 全5組を実ピクセル検査。静かな間はBEFOREと一致、Pico近傍はAFTER、遠方はBEFORE、境界には両者の中間色が存在、完了時はAFTER全体と一致。戦闘へ戻した描画はBEFOREと完全一致。
- 復旧中1,513描画フレームでworld変更0件、旧フラッシュ・振動・ヒット・粒子残留0件。
- 画像遅延・失敗を別の意図的な試験で再現。時間を進めず待機し、再試行後は正常なWAVE 1へ復帰。
- 1920×1080 / 1366×768 / 960×720 / 390×844 / 844×390で横はみ出しなし。エンディング後のRESTART、リロードを確認。
- 正常な通しプレイのConsole error・未捕捉例外・画像リクエスト失敗は0件。

正式CORE背景と180発の弾を含む描画用worldで、30フレームの準備後に各180フレームを測定しました。

| Chrome描画検証 | PC / DPR 1 | CPU 4倍制限 / DPR 2 |
| --- | --- | --- |
| 戦闘描画 p95 | 1.40ms | 5.30ms |
| 復旧描画 p95 | 0.40ms | 1.60ms |
| 戦闘描画 最大 | 2.60ms | 6.90ms |
| 復旧描画 最大 | 0.50ms | 2.10ms |
| animation frame間隔 p95 | 約17ms | 約17〜17.1ms |

画面サイズ1200×750で測定。初回JPEG decode / Canvas準備は定常描画時間に含めません。これは同じPC上でのCPU制限検証であり、実機スマートフォン測定ではありません。負荷検証中も実際のゲームworldへの変更は0件でした。

既存Chrome回帰11スクリプトと新規2スクリプト、合計13スクリプトPASS。メイン回帰31項目すべてPASS。TIME STOP、描画、Undo/Clear/Cancel、TARGET、EXECUTE、被弾、TIME LIMIT補助、WAVE 7のONE STOPと同一WAVE再試行、スコア、LIFE、チュートリアル、タッチ相当操作、レスポンシブ、音、file://起動を確認しました。

既存のTASK B用 `battle-visual-browser.cjs` は以前の手続き型背景のフォールバックを独立検証します。新しい正式JPEG背景の検証は `restoration-browser.cjs` と `stage-performance-browser.cjs` が担当します。

`simulation.js` / `config.js` / `audio.js` / `character-assets.js` / 既存キャラクターPNGはTASK Cから変更していません。既存ブラウザテストの変更は、復旧完了表示を待つこと、CORE後のENDING到達を確認すること、および演出待ち時間への対応です。得点・当たり判定・弾幕等の検査を弱めていません。

テスト出力は `tests/artifacts/restoration/`（既存ignore対象）へ保存。性能テストは独立した描画用world、通しテストは通常の実入力を使い、両者を区別しています。実機スマートフォンの性能・操作、Chrome以外のブラウザの確認は含みません。

## 変更ファイル（27ファイル）

| 区分 | ファイル |
| --- | --- |
| 画面・描画 | `index.html`、`game.js`、`renderer.js`、`journey.js`、`world-map.js`、`world-map.css`、`stage-art.js`（新規） |
| 正式画像 | 上表の `assets/stages/*.jpeg` 10枚（新規） |
| 素材記録 | `assets/stages/README.md`、`assets/stages/manifest.json`（新規） |
| 文書 | `README.md`、`TASK_D.md`（新規） |
| 既存テスト | `tests/browser.cjs`、`tests/journey-helpers.cjs`、`tests/journey.test.cjs`、`tests/world-map-browser.cjs` |
| 新規テスト | `tests/restoration-browser.cjs`、`tests/stage-performance-browser.cjs` |

Node検証：

```powershell
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs tests/journey.test.cjs
```

このPCの既存Playwrightで新規検証を再実行する場合（サーバー起動後）：

```powershell
$env:NODE_PATH = 'C:\Users\F0Bet\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/restoration-browser.cjs
node tests/stage-performance-browser.cjs
```

## 起動・復元

PowerShellで：

```powershell
cd D:\Desktop\AIWorkSpace\01_projects\web\deadline
python -m http.server 4186 --bind 127.0.0.1
```

PowerShellを開いたまま `http://127.0.0.1:4186/` を開きます。既にサーバーが動いていれば再起動不要。Ctrl + Shift + Rで古い表示を更新してください。

TASK Cへ戻すときは、同じ作品フォルダーで `git status` がcleanであることを確認し：

```powershell
git switch backup/deadline-task-c-before-d-20260906
```

TASK Dへ戻すときは：

```powershell
git switch codex/deadline-light-restoration
```

切り替え後はブラウザを再読み込み。未保存の変更がある場合はそこで止め、Codexへ保存を依頼してください。ファイル削除・強制切り替え・reset --hardは不要です。
