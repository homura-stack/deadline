# DEAD/LINE 世界観刷新 TASK B

実施日：2026-09-06。戦闘中のDEAD CIRCUIT背景と、Picoを中心にした視覚ルールの統一。
ワールドマップ、街全体の復旧・点灯、エンディング追加、TASK Cは実装していません。

## Git安全確認

| 項目 | 開始時の確認結果 |
| --- | --- |
| branch | `codex/deadline-pico-world` |
| HEAD / TASK A / 今回のparent | `2b4ba2678b86df2342446c5aa969947ff48d80ea` |
| git status | clean |
| staged / unstaged / 未追跡（ignore対象以外） | 全てなし |
| TASK Aの存在 | HEADに一致。`merge-base --is-ancestor` もexit 0 |
| TASK A保護用branch | `backup/deadline-task-a-before-b-20260906` |
| TASK B作業branch | `codex/deadline-pico-battle` |
| originのfetch / push URL | `https://github.com/homura-stack/deadline.git` |
| merge / push | 未実施 |

コード変更前に保護用branchを作成し、`<local-backup-path>/deadline-pre-task-b-20260906` に全履歴の `deadline-before-task-b.bundle` と、`.git` 以外の作業ファイル156件の `working-files-before-b.zip` を保存しました。bundle検証、ZIPのCRCと件数照合は合格しています。以前のアストラ版とその前の完成版のbranchも維持しています。

## 視覚設計

「暗い基板都市の上で、Picoだけが暖かな光跡を残す」を中心に構成しました。
添付コンセプト画像は電子都市の構造・色彩・電子植物の参考として確認し、ゲームへ画像を貼り付けたり、完全再現したりしていません。

| 役割 | 基本色・表現 |
| --- | --- |
| DEAD背景 | `#060c15` ～ `#101c29`。黒・濃紺の基板面 |
| 建造物・休眠植物 | `#152430` / `#294042` など低彩度の青・青緑。輪郭も暗い |
| Pico・LINEの中心 | `#fff7db`。黄白色の細い芯 |
| Pico・LINEの中間と外側 | `#ffdb85` / `#f4c565`。暖色の黄色・黄金の減衰 |
| TARGET | `#8debf1` を基調としたシアンの枠・番号・ロック時の光 |
| 敵・敵弾・危険 | 赤・マゼンタ・紫。危険区間は赤の線と×印を維持 |

HUDと操作ボタンの配置、表示用Impact、数値用Consolas、日本語用の既存フォント構成は継承しました。
変更した文字情報は戦闘画面の短いコピーと凡例です。自機・LINE・TARGET・敵・敵弾の区別を直接示します。

## LINEとPico

- 描画中、描画終了後、EXECUTE前方の経路、通過後の経路、終点、残像、発火の光、時間停止開始時のPico周辺の光を暖色へ統一。
- LINEは黄白色の細い芯に、暖色の中間光と低alphaの広い黄金色を重ねます。描画中の末尾だけ少し明るくします。
- 最大16個の小さな光粒子を既存経路に沿わせます。危険区間上の粒子は省き、赤い警告を優先します。
- 経路は従来の `route.points` / `S.pointAt` に沿って描画。平滑化、補間用の新しい経路点、カーブへの置換は行っていません。
- PicoはTASK Aの38論理px幅、頭部アンカー、半径9の判定を維持。硬い円状のhaloを柔らかい放射状の減衰へ変更しました。
- 通常移動の残光はRenderer内の位置履歴だけを利用。最大12標本、0.18秒、長い移動でも末尾48pxまでに制限。TIME STOPで時計を止め、新規プレイ・失敗・発火・低減モーション時に履歴をクリアします。
- タッチ描画カーソル、MOVE PADの軌跡、操作説明の自機・LINEも暖色へ合わせました。入力処理や説明のアニメーション時刻は変更していません。

## 背景

`battle-art.js` がVanilla Canvasで描く静的な背景です。

- 周辺に16個の立体的なIC建造物。斜めの投影、側面、端子、屋根の配線、消灯した街灯を配置。
- 休眠状態の電子植物は暗い金属の葉・茎・根として構成。発光、揺れ、点灯はありません。
- 中央には広い暗い回路面を残し、中央の建造物は低alphaにしています。
- 背景の生成結果を最大2解像度のCanvasにキャッシュし、ゲーム中は画像として描画。異なる解像度を交互に描画しても再生成せず、リサイズ後の古い解像度を無制限に保持しません。外部アセット、外部ライブラリ、通信を使用しません。
- 背景モジュールはWAVE、撃破数、プレイヤー状態を受け取りません。WAVEクリア後も同じDEAD背景です。
- TIME STOPでは背景全体を暗くします。最も暗い隅も明るくならないよう、黒のalphaで減衰させます。

## 敵・弾幕

TASK AのPNGは全てそのまま保存しています。三角敵は表示キャッシュ作成時にCanvasの `hue-rotate(125deg)` でシアン発光をマゼンタへ寄せ、TARGETのシアンと区別しました。球体の赤と四枚羽の紫は保持しています。

敵の大きさ・中心アンカー、赤い危険表示、扇状型の識別線、回転型の射出方向、予備DELAY型の予告表示は維持しました。
弾は狙撃・放射を赤、扇状・予告型をマゼンタ、回転型を紫へ変更。形、半径5、軌道、発射時刻、速度、数は変更していません。STOP時も赤紫の色系統を保ちます。

## ゲーム性の保持と規約

`config.js`、`simulation.js`、`game.js`、`audio.js` はTASK A commitとの差分なし。
TIME STOP、一筆書き、TARGET、EXECUTE、敵AI、衝突、得点、LIFE、WAVE、難易度、操作方法を決めるコードは変更していません。
HTML / CSS / Vanilla JavaScript / Canvasのみ。禁止された外部ライブラリや新しい外部ランタイム依存はありません。

## 検証結果

実行環境：Windows / Google Chrome 152.0.7977.82。開発用Playwrightによるブラウザ操作で、Playwrightをゲームへ組み込んではいません。

- ロジック4ファイル：57 / 57 PASS。
- `tests/pico-browser.cjs`：4素材のロード、透過、比率、アンカー、DPR 2、ロード遅延・失敗、`file://` 起動PASS。
- `tests/battle-visual-browser.cjs`：通常・描画・EXECUTE・180弾・低減モーションの描画検証PASS。
- 新しい描画がworldを変更しないこと、通常残光の上限・STOP時の停止・リセット、クリア後も背景が同一であることを確認。

960×600の背景単独のsRGB値の加重明度（0〜255）は中央値21.03、99パーセンタイル40.11、RGBの最大チャンネル値67。背景には1652種類の色差があり、平坦な黒一色ではありません。
LINEの標本は `[255,243,206]`、先端は `[255,247,219]`。シアンのTARGET枠と分離し、全5種類の弾の標本は赤または紫が優勢でした。
これは視認性を補助する描画検査で、全てのモニターでの知覚を保証する指標ではありません。

既存ブラウザ検証8本も全てPASS（TASK Aの素材検証、新規TASK B検証を含め計10本）。

| 検証 | 結果 |
| --- | --- |
| `browser.cjs` | 31 / 31。全10 WAVE、57体撃破、LINE・TARGET・EXECUTE・敵弾・被弾・LIFE・失敗・再挑戦 |
| `title-browser.cjs` | 初回起動、説明画面、7表示サイズ、低減モーション |
| `tutorial-touchpad-browser.cjs` | 説明と練習、7表示サイズ、MOVE PAD、Canvas入力の分離 |
| `route-visual-browser.cjs` | 描画開始、TARGET 1→2、描画完了、EXECUTE、低減モーション時の静止 |
| `execute-feedback-browser.cjs` | 単体・3連続TARGETの発火、CANCEL、時間切れ、音声終了、残像抑制、Console errorなし |
| `final-polish-mobile-browser.cjs` | Chromeのモバイル相当表示で設定・説明・MOVE PADを検証 |
| `barrage-browser.cjs` | 180発、PCとCPU 4倍低速化・DPR 2で負荷基準を満たす |
| `astra-browser.cjs` | 実入力の練習・被弾・再挑戦を2周、1920×1080 / 1600×900 / 1366×768 / 1280×720 / 960×720、リロード、40描画フレームのworld不変 |

180発の描画p95はPC 0.80ms、CPU 4倍低速化で3.50ms。シミュレーション2ステップのp95を加えても、それぞれ1.00ms / 3.90msで既存基準16.7ms未満です。初回背景生成などを含む低速化側の描画最大値は17.60msでした。
実際の弾幕中に3 TARGETをEXECUTEする別の検証ではフレーム間隔p95が16.90ms、終了後の音声数は0でした。

負荷検証で見つかった異なる描画解像度間の背景再生成を修正し、キャッシュ再利用の回帰検証も追加しました。負荷基準やゲームロジックのテストは緩めていません。旧LINE色の検査だけを今回の黄金色仕様へ更新しました。

実入力プレイの1920×1080計画画面と、WAVE 10・180発の描画画面を目視で確認。黄金のPico / LINE、シアンのTARGET、敵3形状、赤紫の弾を暗い都市面から判別できました。EXECUTE専用描画検証では実際に `executing` phaseへ入ったことと、Pico本体から離れた電流部分の暖色も確認しています。
全検証で未処理JavaScript例外・Console errorなし。ゲームからの新しい外部通信なし。実機スマートフォン、他のブラウザ、ユーザー本人の操作感の確認は含みません。

証跡は `tests/artifacts/battle/`、`tests/artifacts/`、`tests/artifacts/astra/` に保存。描画専用シーンと実入力プレイの画面を区別しています。既存のignore設定に従い、証跡画像はcommit対象外です。

## 変更ファイル

- `battle-art.js`：静的なDEAD CIRCUIT背景（新規）。
- `renderer.js`：Pico・LINE・弾幕の色、残光、背景表示。
- `character-assets.js`：三角敵の表示キャッシュの発光色。
- `astra.css`：凡例、MOVE PAD、説明表示のPico系配色。
- `index.html`：背景描画スクリプトの読み込み、戦闘コピー、色の凡例。
- `tests/battle-visual-browser.cjs`：TASK Bの視認性・描画検証（新規）。
- `tests/astra-browser.cjs`：旧シアンLINEの色判定を黄金LINEへ更新。危険色とゲームロジックの検査は維持。
- `TASK_B.md`：安全記録、設計、検証、切り替え手順（本書）。

## 起動・再検証

```powershell
cd .
python -m http.server 4186 --bind 127.0.0.1
```

Chromeで `http://127.0.0.1:4186/` を開きます。別のPowerShellで開発用Playwrightが利用できるNode環境から実行：

```powershell
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs
node tests/battle-visual-browser.cjs
node tests/pico-browser.cjs
node tests/browser.cjs
node tests/title-browser.cjs
node tests/tutorial-touchpad-browser.cjs
node tests/route-visual-browser.cjs
node tests/execute-feedback-browser.cjs
node tests/final-polish-mobile-browser.cjs
node tests/barrage-browser.cjs
node tests/astra-browser.cjs
```

## TASK Aへ戻す / TASK Bへ戻す

上の作品フォルダーで `git status` を実行し、`working tree clean` であることを確認してから、戻したい方だけ実行します。

```powershell
git switch backup/deadline-task-a-before-b-20260906
```

```powershell
git switch codex/deadline-pico-battle
```

切り替え後はブラウザを `Ctrl + Shift + R` で再読み込みします。保存用branch上では編集しません。
未保存の変更が表示された場合は、そこで止めてCodexに保存を依頼してください。強制切り替え、`reset --hard`、`git clean` は使いません。
