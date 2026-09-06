# DEAD/LINE 世界観刷新 TASK C

実施日：2026-09-06。WORLD MAP、既存10 WAVEを使う5エリア進行、GARDENのLIGHT RESTORED。
TASK DのCORE最終演出・エンディングは含みません。

## Git安全確認

| 項目 | 作業開始時 |
| --- | --- |
| branch | `codex/deadline-pico-battle` |
| HEAD / TASK B / 今回のparent | `30496249392205ca6f84b0743ff9b73cfbcb48bf` |
| TASK A | `2b4ba2678b86df2342446c5aa969947ff48d80ea` |
| status / staged / unstaged / 未追跡 | clean / 全てなし（ignore対象を除く） |
| TASK A / Bの到達可能性 | 両方の `merge-base --is-ancestor` がexit 0 |
| 保護branch | `backup/deadline-task-b-before-c-20260906` |
| TASK C branch | `codex/deadline-world-map` |
| origin | `https://github.com/homura-stack/deadline.git` |
| merge / push | 未実施 |

コードを変更する前に、`D:\Desktop\AIWorkSpace\backups\deadline-pre-task-c-20260906` へ全履歴の `deadline-before-task-c.bundle` と `.git` 以外の166ファイルを含む `working-files-before-c.zip` を保存。bundle検証、ZIPのCRC・件数検証は合格。TASK A、TASK B、アストラ版、元版の既存branchを保持しています。

## 画面とアートディレクション

既存のImpact（見出し）、Consolas（数字・状態）、日本語UIフォントを継承。暗い紺 `#080c1b`、金属の青 `#344b5a`、Picoの黄金 `#f4c565`、黄白 `#fff0b5`、電子植物の青緑 `#75bfb0`、安全情報のシアンを役割に沿って使います。

参考画像は構図・回路都市・復旧前後の資料として確認し、画像そのものは使用していません。1枚のSVG上に5つの島を配置し、HTMLの選択ボタンを重ねています。背景写真や外部画像の新規導入はありません。

- GARDEN：丸い葉と花、小さな基板の建造物。
- FORGE：煙突、工場、歯車を表す輪。
- CANAL：円環の水路、橋、流路。
- SKYLINE：高さの異なる塔と垂直の稜線。
- CORE：花と発光器官を連想させる大きな中心核。

未復旧の街はLOCKED / AVAILABLEで同じ暗さを維持。現在地のPicoと小さな黄金の端子が入口を示します。ONLINEになった街だけ稜線・窓・葉・外周リングを点灯します。未解禁地区を選ぶとLOCKEDと解禁条件を示し、ENTERは無効になります。

回路は両端が復旧した区間だけ常時点灯。次の地区の解禁時は、その地区へ1回だけ電流を走らせ、未復旧の街を常時点灯させません。

## 5エリア進行

| エリア | 既存WAVE | 次の解禁 |
| --- | --- | --- |
| 01 GARDEN / 蛍庭区 | 1–2 | FORGE |
| 02 FORGE / 機関区 | 3–4 | CANAL |
| 03 CANAL / 電流水路区 | 5–6 | SKYLINE |
| 04 SKYLINE / 天蓋区 | 7–8 | CORE |
| 05 CORE / 中央核 | 9–10 | 5地区ONLINEのマップまで |

`journey.js` は戦闘worldと別に、画面モード・現在地区・復旧済み地区数・選択地区・短い演出時刻・最後のLINEのコピーを保持します。マップ上の復旧状態と解禁順を、この1つの状態から導出します。

`simulation.js` と `config.js` はTASK Bから変更していません。マップ・エリア表示・復旧演出中は `game.js` がシミュレーション更新を止め、入力も遮断します。次地区を開始すると、既存のWave間遷移だけを再開します。敵・弾・得点・LIFEの独自再生成や再計算はしません。

WAVE 1→2など地区内は以前と同じ自動進行。2 / 4 / 6 / 8 / 10の `waveClear` イベントだけをエリアクリアとして扱います。WAVE 6→7のONE STOP説明と承認、失敗時の同一Waveリトライ、任意TIME LIMIT補助も残しています。

タイトルのSTARTから必ずWORLD MAPへ進みます。GARDENのENTERはそのまま戦闘へ、任意の「操作を練習する」は既存4ページBRIEFINGとPRACTICEへ進みます。練習・スキップの後も短いGARDEN表示を挟みます。

進行状態は現在のプレイ中に保持します。自動セーブは新設していません。R / 「最初から」、タイトル帰還、リロードは新しい旅になり、音量・タッチ感度の既存保存は維持します。COREクリア後は通常の5地区ONLINEマップに戻り、最終完全復旧演出や新しいエンディングへは進みません。

## LIGHT RESTORED

- GARDENのWAVE 2クリア後、3.2秒の短い復旧表示。他地区は同じ構造の2.4秒表示。
- 最後にプレイヤーが描いた経路のコピーを、そのまま黄金色で描き出します。
- 光が終点から基板の回路へ広がり、周辺の電子植物と小さな光点を順に点灯します。
- Picoのhaloが強くなり、`LIGHT RESTORED` / `GARDEN // ONLINE` を表示。
- 終了後にGARDENをONLINEとして記録し、マップでFORGEを解禁。
- 戦闘中の背景はTASK Bの暗いDEAD CIRCUITのまま。復旧レイヤーはクリア後だけ描きます。
- 低減モーション時は静止した復旧状態を1秒表示し、回路移動・光輪の拡大を抑制。エリア開始も0.2秒（通常0.85秒）へ短縮。

## キャラクターサイズ

| 素材 | TASK B | TASK C | 倍率 |
| --- | --- | --- | --- |
| Pico | 38px | 48px | 約1.26倍 |
| 球形敵 / 三角敵 | 44px | 52px | 約1.18倍 |
| 四枚羽敵 | 42px | 50px | 約1.19倍 |

値は960×600の論理座標上の描画幅。PNG、縦横比、頭部・コアのアンカーは変更なし。判定半径はPico 9、敵15、弾5のままです。TARGETは敵のスプライトより後に描く従来の順序を維持しています。

## 検証

- Node：既存57件＋エリア進行6件、合計63件PASS。
- 新規Chrome検証：タイトル→MAP→GARDEN WAVE 1→2→LIGHT RESTORED→MAP→GARDEN ONLINE→FORGE WAVE 3、実入力でPASS。
- 上記でGARDEN終了時7体撃破・2150点・LIFE 1、FORGEへの得点・撃破数の持ち越しを確認。
- マップ・エリア開始・復旧演出中のworld停止、描画によるworld変更なし、未解禁地区の入場禁止、再スタート、リロード、低減モーションを確認。
- 1920×1080 / 1366×768 / 960×720 / 390×844 / 844×390で、マップの横はみ出しと地区ボタンの重なりなし。

- 既存Chromeテスト10スクリプトと新規マップ検証1スクリプト、計11スクリプトPASS。メイン検証は31項目すべてPASS、Console error / 未捕捉例外なし。
- 全10 WAVEを実入力でクリアし、5地区ONLINEまで確認。最終18400点・57体撃破。WAVE 7のONE STOP説明と失敗後の同一Wave再挑戦もPASS。
- 復旧描画193フレームの検査でworld変更0件。通常・TIME STOP・EXECUTE、TARGET捕捉、被弾、スコア、LIFE、リスタート、任意TRAINING、タッチ操作、リロード、file://起動も既存検証でPASS。
- 拡大後のPico・敵3種、黄金LINE・シアンTARGETの画像を確認。初回ロード・DPR 2・画像ロード遅延/失敗時の既存フォールバックもPASS。
- 弾180個の負荷検証で、描画＋シミュレーション2ステップのp95合計はPC 1.00ms、Chromeの4倍CPU制限/DPR 2で4.00ms。後者の描画最大17.60msは初回背景キャッシュ作成を含みます。実機スマートフォンの性能保証ではありません。
- `simulation.js` / `config.js` / `audio.js` / 既存キャラクターPNG / TASK B戦闘背景は変更なし。新しい外部ランタイム依存なし。構文検査と `git diff --check` はPASS。

実行環境：Windows / Google Chrome 152.0.7977.82。開発用Playwrightによる実入力操作と、描画専用の検査を分けています。実機スマートフォンや他ブラウザでの確認は含みません。

既存ブラウザテストはマップ→任意TRAININGという新しい導線を実操作で追加。2 WAVE目の表示検査と、WAVE 10終了後の遷移先検査だけを新仕様へ合わせ、得点・衝突・弾幕・リトライ等の検査は維持しています。デバッグでマップを迂回する別ルートはありません。

Nodeテストの再実行：

```powershell
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs tests/journey.test.cjs
```

Chrome検証は既存の開発用PlaywrightとChromeを使用。ローカルサーバーを起動したうえで、以下の各ファイルを `node tests/ファイル名.cjs` で実行します。今回、製品へのライブラリ追加やインストールは行っていません。

`browser`、`title-browser`、`tutorial-touchpad-browser`、`route-visual-browser`、`execute-feedback-browser`、`final-polish-mobile-browser`、`pico-browser`、`battle-visual-browser`、`astra-browser`、`barrage-browser`、`world-map-browser`。

このPCで使用したモジュール探索先：

```powershell
$env:NODE_PATH = 'C:\Users\F0Bet\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
```

## 変更ファイル（20ファイル）

| 区分 | ファイル |
| --- | --- |
| 新規・進行と描画 | `journey.js`、`world-map.js`、`world-map.css` |
| 既存・画面統合とサイズ | `index.html`、`game.js`、`renderer.js`、`character-assets.js` |
| 文書 | `README.md`、`TASK_C.md`（新規） |
| 新規・テスト | `tests/journey-helpers.cjs`、`tests/journey.test.cjs`、`tests/world-map-browser.cjs` |
| 既存・テスト導線調整 | `tests/astra-browser.cjs`、`tests/browser.cjs`、`tests/execute-feedback-browser.cjs`、`tests/final-polish-mobile-browser.cjs`、`tests/pico-browser.cjs`、`tests/route-visual-browser.cjs`、`tests/title-browser.cjs`、`tests/tutorial-touchpad-browser.cjs` |

新規画像アセットなし。スクリーンショット・実行結果JSONは既存のignore対象に保存し、commitには含めません。

## 起動と復元

WindowsのPowerShellで：

```powershell
cd D:\Desktop\AIWorkSpace\01_projects\web\deadline
python -m http.server 4186 --bind 127.0.0.1
```

起動したPowerShellを開いたまま、Chromeで `http://127.0.0.1:4186/` を開きます。既にサーバーが動いていれば再起動は不要です。ブラウザは `Ctrl + Shift + R` で再読み込みしてください。

TASK Bへ戻したいときは、作品フォルダーで `git status` がcleanなのを確認して：

```powershell
git switch backup/deadline-task-b-before-c-20260906
```

TASK Cへ戻すときは：

```powershell
git switch codex/deadline-world-map
```

切り替え後にブラウザを再読み込みします。未保存変更がある場合はそこで止め、Codexに保存を依頼してください。強制切り替え・ファイル削除・`reset --hard` は不要です。
