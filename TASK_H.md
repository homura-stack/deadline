# TASK H — 正式WORLD MAP・地区別復旧・完全復旧

## Git安全確認

- 作業開始branch: `codex/deadline-classic-training-experience`
- 開始HEAD / 今回のparent: `cc7bbd2322e821d3cfb479d37b82d4184ee48f26`
- staged / unstaged / 非ignored未追跡ファイル: なし。指定の基準commitと完全一致。
- 作業branch: `codex/deadline-world-map-final`。開始commitから作成。
- 元branchとcommitを保持。merge / push・ファイル削除は行わない。
- remoteは既存の`origin`（`https://github.com/homura-stack/deadline.git`）。公開版への反映は行わない。

## 正式素材と画質

| 背景 | ゲーム内パス | 原寸 | SHA-256 |
| --- | --- | --- | --- |
| BEFORE | `assets/world-map/before.jpeg` | 2752 × 1536 | `dda4a2d70d7cfb28d8f286466c9af0c4484725b807afe7820b3abae78af7676a` |
| AFTER | `assets/world-map/after.jpeg` | 2750 × 1536 | `6dd325544d929130d9ffaf98313c43aa37349995bb280fb31359d5ee2cecee30` |

原本は`<local-asset-path>/完全復旧前WORLD MAP.jpeg`と`完全復旧後WORLD MAP.jpeg`。両方ともコピー前後のハッシュが一致。元ファイルを加工せず使用した。[素材記録](assets/world-map/README.md)を参照。

BEFOREは`<img>`、AFTERはSVG内の`<image>`で原JPEGを直接描画する。製品側でCanvasへ画像を再描画・縮小保存する処理はない。画像自身へのblur・ズーム・再圧縮はない。両方を共通の1000 × 558.139535座標と2752:1536の表示領域へ合わせ、2pxの横幅差だけを非破壊的に正規化する。表示幅の上限は2750px。

| Chrome viewport（DPR 1） | 画像の実表示サイズ（CSS px、概数） | AFTER比の横倍率 |
| --- | --- | --- |
| 1920 × 1080 | 1737.91 × 969.98 | 0.632倍 |
| 2560 × 1440 | 2382.91 × 1329.98 | 0.867倍 |
| 1366 × 768 | 1178.91 × 657.98 | 0.429倍 |
| 3840 × 2160 | 2750 × 1534.88 | 1.000倍（原寸上限） |

## 地区配置・操作UI

原画像を確認して、中央の核、下の庭、左の工業区、右の水路、上の塔群へ配置した。`journey.js`に残る旧SVG用の島座標は利用していない。

| 地区 | 画像左上を原点とする座標 (x%, y%) | 正規化座標 (x, y) |
| --- | --- | --- |
| GARDEN | (50.00, 86.00) | (500, 480) |
| FORGE | (16.00, 50.17) | (160, 280) |
| CANAL | (83.50, 48.38) | (835, 270) |
| SKYLINE | (49.50, 21.14) | (495, 118) |
| CORE | (50.00, 47.12) | (500, 263) |

HTMLボタンとSVGビーコンは同じ座標から描画する。小さな点・輪・光の星に、AREA名・LOCKED / UNLOCKED / RESTOREDを添える。クリック領域は44px、フォーカス輪を維持。LOCKEDも従来どおり調べられるが、ENTERは無効。マウス、Tab / Enter、既存のMAPキー操作は維持した。正式Pico画像を次の進行地点に表示する。

PCでは美術を広く使い、左上に進行情報、右下に選択地区とENTER / TRAININGを置く。1366×768ではCANALのラベルと重ならないよう詳細文を省略し、狭い画面では説明と操作を画像の外へ配置する。画像とノードの相対座標は変わらない。

## 地区別の復旧

`world-map.js`の`frame()`が既存の`journey.restored` / `unlockFrom` / `elapsed`を読み、描画値だけを計算する。進行状態を更新する処理は追加しない。

- 初期状態のマスクは透明。BEFOREだけを表示し、GARDENのみUNLOCKED。
- 各AREAのLIGHT RESTORED完了後、該当地区の有機的な輪郭を持つマスクがPicoの地点付近から約3.2秒で広がる。境界だけに8座標単位のGaussian featherを適用する。
- 復旧済みのマスクは1で保持。地区の選択やTRAINING再受講で復旧範囲は変化しない。
- 復旧地区同士の接続は柔らかな線状マスクで徐々に露出する。新しい接続だけが約3.1秒で通電し、既存接続は保持。
- 新地区のビーコンは小さな光→強い光→減光→再応答→安定光。既存地区は弱く応答する。発光値の連続性も自動検証した。

## SYNCとENDING

既存`journey.js`の時間軸を維持する。CORE復旧で地区マスクは5つになるが、全景を露出するマスクはまだ0。

GARDEN→FORGE→CANAL→SKYLINE→COREの応答から、既存の共通周期へ徐々に揃える。4.4〜4.95秒で光を少し落とし、既存のSYNC表示に合わせ、4.95〜6.8秒で全景AFTERを0→100%へ広げる。暗転は最大12%で白フラッシュは使わない。補助の回路線は全面AFTERに溶け込み、元画像そのものが主役になる。

6.8秒で完全復旧し、既存ENDINGが始まる8.4秒まで約1.6秒間、全景を見せる。ENDINGも全景を残したまま表示し、プレイヤーがTITLE / RESTARTを操作するまで眺められる。DEAD/LINE・日本語コピー・英語コピーは維持。reduced-motionは既存4秒の時間軸へ合わせ、不要な点滅を抑える。

## 保護範囲

`game.js`、`journey.js`、`tutorial.js`、`config.js`、`simulation.js`、`renderer.js`、`index.html`、`character-assets.js`、`stage-art.js`、タイトル関連CSS / JS、`tutorial.css`、既存素材は基準commitと同一。START→毎回TRAINING、69521cf型の4ページ・64px移動・5秒STOP・2 TARGET・EXECUTE、Pico・当たり判定、10 WAVE、SCORE / LIFE、地区LIGHT RESTORED本体は変更していない。

製品側の変更は`world-map.js` / `world-map.css`と正式JPEG2枚。その他は素材記録、README、本記録、テストのみ。新しい外部ランタイム依存はない。

## 検証

- A: 保存なしTITLE → START → 既存TRAININGを実操作で完了 → MAP → GARDEN。PASS。
- B: タイトル常設TRAINING → 同じ説明ページ0から開始。PASS。受講済みSTARTもTRAININGへ入る既存回帰を維持。
- C〜E: 実際のWAVE 1〜8を操作し、各LIGHT RESTORED後に既存復旧領域が保持され、次の地区だけが解禁されることを検証。
- F: 実際のWAVE 10 → MAP → SYNC → 100% AFTERを表示する間 → ENDING。SCORE 18400 / KILLS 57 / LIFE 1 / 被弾0の既存結果も維持。
- 独立した描画fixtureでChromeの実ピクセルを原JPEGと比較。復旧0〜4地区について、既復旧の発光箇所はAFTER、未来地区はBEFOREに一致。途中の柔らかな境界、CORE直後の全景非表示、SYNC時の全景露出、ENDINGでの維持も確認。
- 指定3解像度、連続リサイズ、960×720 / 390×844 / 844×390 / 4Kを検証。AREA中心の誤差は0.1 CSS px未満。ラベルと詳細の非重複、横はみ出しなし、画像の原寸上限を検証。
- 通常経路と、意図的な画像取得失敗→再読み込みの検証は分離する。テスト用fixtureは進行を偽装する製品機能としては追加しない。

最終結果（2026-09-06）: **A〜FすべてPASS、Node 79 / 79 PASS（既存75＋Hの4件）、Chrome 18スクリプトPASS**。Chromeは152.0.7977.82をheadlessで自動操作した。通常経路の最終確認でConsole error / 画像ロードエラーは0。`node --check world-map.js` / `git diff --check` / 保護範囲比較もPASS。

Chromeの対象: `title-quality-training-browser`、`title-routes-browser`、`world-map-browser`、`restoration-browser`、`tutorial-entry-browser`、`pico-tutorial-browser`、`title-browser`、`tutorial-touchpad-browser`、`astra-browser`、`pico-browser`、`battle-visual-browser`、`route-visual-browser`、`execute-feedback-browser`、`barrage-browser`、`final-polish-mobile-browser`、`stage-performance-browser`、`browser`、新規`world-map-art-browser`。

`stage-performance-browser`の最初の実行では描画時間の検証は通過したが、リソース取得で一度`ERR_NO_BUFFER_SPACE`が発生した。取得失敗の詳細を記録する診断フックを付け、**当該テストをコード変更なしで単独再実行するとエラーなしでPASS**した。失敗は再現せず、原因となったURLは特定できていない。初回ログと再実行ログを両方保持する。再実行時の4倍CPU制限・DPR 2の描画P95は戦闘5.5ms、復旧1.4ms（16.7ms未満）。この性能値は既存戦闘描画テストの結果であり、WORLD MAP専用の性能測定とは区別する。

ログはGit対象外の`tests/artifacts/task-h/`、通し進行のスクリーンショットは`tests/artifacts/restoration/`。初回検証は隔離したChromeプロファイルで行い、ユーザーの保存データは初期化しない。タッチ相当はChromeエミュレーションであり、物理スマートフォンの確認ではない。

## 起動・復元

確認URL: `http://127.0.0.1:4186/`。ページはCtrl+F5で更新する。

Windowsでサーバーを再起動する場合:

```powershell
Set-Location '.'
python -m http.server 4186 --bind 127.0.0.1
```

元の正常版へ戻すには、`git status`がcleanであることを確認してから`git switch codex/deadline-classic-training-experience`。TASK Hへ戻すには`git switch codex/deadline-world-map-final`。切替後はブラウザでCtrl+F5。未保存変更がある場合は保存してから切り替える。
