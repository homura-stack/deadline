# DEAD/LINE — Public Playtest RC1

**通常時間でかわし、止まった世界にルートを描き、一気に駆け抜ける。**

DEAD/LINEは、機械生命体のホタルPicoを操作し、5つのAREA・全10Waveを攻略して回路都市へ光を戻すブラウザアクションゲームです。弾幕回避と、時間停止中の一筆書きによるルート設計を組み合わせています。

[GitHub Pagesでプレイ](https://homura-stack.github.io/deadline/)

ビルド・ゲームのインストールは不要です。PC／タッチ操作に対応しています。自動検証環境はGoogle Chromeで、物理スマートフォンの操作感・性能は別途プレイテストが必要です。

## 基本ループ

**TIME STOP → DRAW → LOCK → EXECUTE**

1. 通常時間に敵弾をかわし、TIME STOPゲージを溜めます。
2. 100%でSPACE／TIME STOPボタンを押すと、敵と実弾が停止します。
3. 停止中に安全なルートを描き、敵を通してLOCKします。
4. SPACE／EXECUTEでPicoがそのルートを高速移動し、LOCKした敵を連続撃破します。

**敵弾のすぐ近くをかわすNear Missで、TIME STOPゲージが大きく増えます。** 危険へ踏み込むほど早く時間を止められます。RC1の通常回復は15/秒、Near Miss報酬は+16、初期値20、最大100です。満タンになるとREADYを通知し、使用可能な間はゲージに白い波動を表示します。調整値は[config.js](config.js)で管理しています。

ルートの赤い区間は停止中の実弾に接触する危険箇所です。描画そのものでは被弾しませんが、EXECUTE中も安全な経路が必要です。UNDO／CLEARで修正できます。

Wave 7〜10は **ONE STOP / ONE EXECUTION**。1回の停止・実行で全敵を撃破する必要があります。同じWaveで3回失敗すると停止時間×1.5、5回で×2.0の救済を任意で選べます。通常のGAME OVERからは同Waveをリトライでき、これはページ再読込時のAREA単位再開とは異なります。

## STARTとTRAINING

- 初回・TRAINING未完了：TITLE → START → TRAINING → WORLD MAP。
- TRAINING完了済み：TITLE → START → 保存された進行のWORLD MAP。
- タイトルの独立したTRAININGボタンから、いつでも再受講できます。HOW TO PLAYやWORLD MAPにも練習への入口があります。

TRAININGは5枚の説明（EVADE → NEAR MISS → FREEZE → DRAW → EXECUTE）と実践で構成されます。実践では移動、Near Missによる充電、本人の入力によるTIME STOP、2 TARGETのLOCK、EXECUTEを体験します。Near Miss段階はゲージ84から始まり、練習中の通常回復を止め、実際の+16でREADYへつながります。

正常完了時だけ受講済み状態を保存します。再受講しても本編の進行・スコアを失いません。練習の再開操作は練習だけをやり直します。

## WORLD MAPとAREA進行

| AREA | Wave |
| --- | --- |
| GARDEN / 蛍庭区 | 1–2 |
| FORGE / 機関区 | 3–4 |
| CANAL / 電流水路区 | 5–6 |
| SKYLINE / 天蓋区 | 7–8 |
| CORE / 中央核 | 9–10 |

AREA内の2WaveをクリアするとLIGHT RESTOREDとなり、次AREAが解放されます。マップ上のPicoは**選択カーソルではなく本編の進行位置**です。過去AREAを選んでも移動しません。Reduced Motionではホバリング等を抑えます。

復旧済みAREAは選択して再挑戦できます。再挑戦中の状態は本編とは一時的に分離され、終了後は本編の進行・累計値へ戻ります。本編の復旧／解放状態を巻き戻したり、再挑戦の得点を本編累計へ加算したりしません。

CORE復旧後はSYNC演出を経てENDINGへ進みます。ENDINGのWORLD MAPボタン、または再起動後のSTARTで、全AREA復旧済みマップへ戻って再挑戦できます。Picoの進行位置はCOREです。ENDINGを起動のたびに自動再生する仕様ではありません。

## 操作

| 操作 | PC | タッチ |
| --- | --- | --- |
| Pico移動 | フィールド内でマウス移動 | 画面下のMOVE PADをドラッグ |
| TIME STOP | ゲージ満タン時にSPACE | TIME STOPボタン |
| ルート描画／LOCK | 停止中にフィールドをドラッグ | 停止中にMOVE PADをドラッグ |
| UNDO | Z | UNDOボタン |
| CLEAR | X | CLEARボタン |
| CANCEL | C／Escape | CANCELボタン |
| EXECUTE | SPACE | EXECUTEボタン |
| GAME OVERから同Wave再挑戦 | SPACE／Enter | RETRY WAVEボタン |
| AREA選択・開始 | ノードとENTERボタンを操作 | ノードとENTERボタンをタップ |

タッチの戦闘入力はMOVE PAD＋画面ボタンで行います。フィールドへの直接タップ・ドラッグでは操作しません。停止中のDRAWカーソルは相対移動し、指を離しても描画済みルートと位置を維持します。再接触で続きから描けます。

SETTINGSのTOUCH SENSITIVITYは50〜150%（初期100%）。MOVEとDRAWの両方へ適用して保存します。DRAWは通常移動より低い感度です。

## 音量設定

SETTINGSでMASTER／SFXをそれぞれ0〜100に調整し、ミュートも切り替えられます。初期値はMASTER 80／SFX 90です。設定は次回起動時にも復元されます。音声はブラウザの制約に従い、ユーザー操作後に開始／再開します。

SEはWeb Audio APIによる実行時合成です。共通ゲイン4.0、ソフトリミッター、個別イベントの音量階層を使用しています。[音声設計・計測方法](docs/AUDIO_DESIGN.md)を参照してください。

## 永続セーブと再開仕様

進行はブラウザのlocalStorageへ自動保存します。**AREA途中で閉じた場合は、そのAREAの先頭Waveから再開**します。弾・敵位置や描画中ルートを途中復元するものではありません。

例：FORGEのWave 4途中で終了 → START → FORGEが攻略可能なWORLD MAP → FORGEのWave 3から再挑戦。スコア等もGARDENクリア確定時点へ戻り、未確定Waveの二重加算を防ぎます。

### 保存キー

| key | 内容 |
| --- | --- |
| `deadline.progress.v1` | AREAクリア確定時点の本編進行・累計値 |
| `deadline.tutorial.v1` | TRAINING受講状態 |
| `deadline.audio.v1` | MASTER／SFX／mute |
| `deadline.controls.v1` | タッチ感度 |

TRAININGとAudioは既存の別保存を使用し、進行データへ重複保存しません。

### 進行データ形式

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

これは形式例です。`restored`は先頭から連続して復旧したAREA数（0〜5）。`run`はその確定時点の累計スコア・最大chain・撃破数・PERFECT実行数・被弾数・時間です。ハイスコア／AREA別ランキングではありません。

[journey.js](journey.js)が保存・検証を担当し、[game.js](game.js)が安全な境界で保存／復元を呼び出します。

- 現在地Picoは0始まりのAREA番号 `Math.min(restored, 4)` から算出します。
- 解放状態は既存のAREA状態判定から導出します。
- 未攻略AREAの再開Waveは、復旧数0／1／2／3／4に対して1／3／5／7／9です。
- 全クリアは `restored === 5` で判定します。
- 現在AREA、最高到達AREA、Pico位置、ENDING済みフラグを同義の値として重複保存しません。
- 選択カーソル、敵・弾、ゲージ、HP、ルート、AREA内の中間Wave到達、失敗回数・救済選択は永続保存しません。

### 保存タイミングと安全性

本編AREA最終Waveの撃破確定時、復旧後のマップ表示、WORLD MAPへの正常復帰、ENDING到達時に保存を通知します。復旧演出中にreloadしても、そのAREAのクリアは保持します。毎フレームは書き込まず、同じ確定状態の重複書き込みを避けます。

過去AREA再挑戦やTRAININGの一時worldは保存対象から除外します。再挑戦中にreloadしても本編の保存位置へ戻ります。古いタブの下位進行で確定済みAREAを上書きしない保護もあります。

起動時はversion・AREA数・必須累計値の型と範囲を検証し、検証済みフィールドだけ復元します。不正JSON、version不一致、欠損、不正値の場合はGARDEN・累計0へフォールバックします。読込だけでデータを削除せず、正常な保存通知時に有効な形式を保存します。

localStorageの拒否・容量不足は例外で起動を止めず、ページ内チェックポイントを保持し、後の安全な保存時に再試行します。ただし**保存できない環境ではページ終了後の永続性を保証できません**。

保存は同じブラウザプロファイル・同じoriginで有効です。公開URL、ローカルHTTP、ローカルファイル、別端末／ブラウザの保存は共有されません。ブラウザデータ削除やプライベートモード終了で失われる場合があります。クラウド同期、NEW GAME、セーブ削除UIはありません。

## ローカル起動と公開構成

リポジトリルートで静的HTTPサーバーを起動します。

```sh
python -m http.server 4186 --bind 127.0.0.1
```

[ローカル版](http://127.0.0.1:4186/)をChromeで開きます。ローカルファイル直接起動も検証対象ですが、開発・公開相当の検証にはHTTPを推奨します。

GitHub Pagesではルートの`index.html`と相対パスのJS／CSS／画像をそのまま配信します。サーバー側処理やビルド工程はありません。

## 使用技術・外部依存

ゲーム本体はHTML／CSS／JavaScript、Canvas、Web Audio、Pointer Events、requestAnimationFrame、localStorageで実装しています。

**配信するゲームは外部JavaScriptライブラリを使用していません。Bootstrapも使用していません。** jQuery／anime.js／Pixi.js等のフレームワーク、CDN、外部API、外部フォントへの実行依存もありません。

Playwrightは開発時のブラウザ検証専用で、ゲームページから読み込まれません。これは実装上の事実の説明であり、コンテスト規約全体への適合認定ではありません。素材・AI利用を含む応募先の要件は、主催者の規約と別途照合してください。

## 構成・素材

| ファイル | 責務 |
| --- | --- |
| `index.html`、各CSS | タイトル・HUD・TRAINING・WORLD MAP・レスポンシブ表示 |
| `config.js` | Wave・入力・ゲージ・演出・音響パラメータ |
| `simulation.js` | DOM非依存の戦闘状態・ルート・衝突・Wave進行 |
| `game.js` | 入力、固定時間更新、画面遷移、イベントのUI／音への振り分け |
| `journey.js`、`world-map.js` | AREA進行・セーブとマップ表示 |
| `renderer.js`、`battle-art.js`、`character-assets.js`、`stage-art.js` | Canvas描画、素材キャッシュ、復旧表示 |
| `title-screen.js`、`tutorial.js` | タイトル補助UI、TRAINING入口・受講保存 |
| `tests/` | Node／Chrome回帰テストとfixture |

正式タイトルは提供された完成PNGを使用し、ロゴ・字幕を重ねません。HUD用の字幕なし正式ロゴは未提供のため、HUDは既存文字表示です。SEは実行時合成で、画像・音声を外部サーバーから取得しません。

素材の出典・加工・寸法・ハッシュは以下に記録しています。

- [Pico・敵素材](assets/characters/README.md)
- [正式タイトル・ロゴ](assets/title/README.md)
- [ステージ背景](assets/stages/README.md)
- [WORLD MAP背景](assets/world-map/README.md)

本リポジトリにはライセンスファイルを含めていません。公開されていること自体は素材等の再利用許諾を意味しません。

## テスト

**RC1公開時点の検証結果：Node 110/110 PASS、Chrome 26/26スクリプト PASS。** これは公開時点の記録であり、以後の変更については再実行してください。

Node.jsとGoogle Chromeが必要です。Chromeテストには、Nodeのモジュール検索パスから解決できるPlaywrightを用意してください。既存の検証用インストールを使うか、リポジトリ外の検証用ディレクトリに`npm install playwright`で導入し、その`node_modules`を環境変数`NODE_PATH`へ指定します。ゲーム本体への依存追加は不要です。

リポジトリルートで実行します。

```sh
# Node全件（13テストファイル）
node --test tests/*.test.cjs

# 別ターミナルで上記HTTPサーバーを起動してから、Chrome全件
node tests/run-browser-suite.cjs

git diff --check
```

PowerShellでNodeテストのワイルドカードが展開されない環境では、次を使用できます。

```powershell
$testFiles = Get-ChildItem tests -Filter *.test.cjs | ForEach-Object FullName
node --test $testFiles
```

JavaScript構文確認（Node以外の追加依存なし）：

```sh
node -e "const fs=require('node:fs'),cp=require('node:child_process'); for(const dir of ['.','tests']) for(const name of fs.readdirSync(dir)) if(/\.(js|cjs)$/.test(name)) cp.execFileSync(process.execPath,['--check',dir+'/'+name],{stdio:'inherit'});"
```

既定の接続先は`http://127.0.0.1:4186/`です。`DEADLINE_TEST_URL`で検証対象のベースURL（末尾`/`）を指定できます。検証は隔離されたブラウザで行いますが、ログ・画像・テスト用プロファイルを生成するため、普段のユーザーデータでは実行しないでください。

全件ランナーは`browser.cjs`と`*-browser.cjs`を列挙します。結果はGit管理外の`tests/artifacts/`に保存し、全件サマリーの既定位置は`tests/artifacts/task-k/suite-logs/summary.json`です。`DEADLINE_REPORT_DIR`でランナーの出力サブディレクトリを切り替えられます。

検証範囲：ゲージ・Near Miss・READY、TRAINING、被弾／retry、全10Wave／ENDING、AREA進行・再挑戦、永続セーブ／reload、Pico現在地、PC／タッチ相当、画像フォールバック、音量保存・OfflineAudioContext計測、コンソールエラー。

[Wave 7経路探索の調査記録](docs/WAVE_7_TEST_INVESTIGATION.md)も参照してください。自動経路探索の成功は体感難易度を保証しません。物理スマートフォン、PCスピーカーでの聴感、長時間プレイは人間による確認が必要です。
