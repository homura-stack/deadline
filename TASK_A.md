# DEAD/LINE 世界観刷新 TASK A

実施日：2026-09-06。範囲はGitの安全確保とPico・敵3種類のゲーム内表示導入です。
TASK B、ワールドマップ、背景の全面改装、エンディング、タイトルの世界観コピー差し替えには進んでいません。

## 開始時のGit確認と保護

| 項目 | 確認結果 |
| --- | --- |
| 開始branch | `codex/web-contest-astra-redesign` |
| HEAD / 今回のparent | `6f1bdd089c08ba6cd136e483d92288539e512d1b` |
| git status | clean |
| staged / unstaged | いずれもなし |
| 未追跡ファイル（ignore対象以外） | なし |
| 保存状態 | アストラ版は全てcommit済み。追加の保存commitは不要 |
| アストラ版の保護用branch | `backup/deadline-astra-before-pico-20260906` |
| TASK A作業branch | `codex/deadline-pico-world` |
| さらに前の完成版 | `main` / `backup/deadline-before-astra-20260906`、`c9276a0f97a2b0d000c2c0f3ad20b20ffcaffda6` |
| origin設定 | `https://github.com/homura-stack/deadline.git`（fetch / push URL） |
| merge / push | 未実施。今回remoteへの更新は不要 |

コード変更前に、上記アストラcommitへの保護用branchを作成しました。
`<local-backup-path>/deadline-pre-pico-task-a-20260906` に次も保存しています。

- `deadline-before-pico.bundle`：開始時の全Git履歴・全参照。`git bundle verify` 合格。
- `deadline-working-files.zip`：`.git` 以外の作業ファイル140件。ignoreされた過去の検証画像も含む。ファイル数とZIPのCRCを検証済み。
- `RESTORE.md`：開始時のSHA、branch、復元手順。

既存branchへのcommit追加、ファイル削除、reset、clean、履歴の書き換えは行っていません。

## 実装

- 添付原本を保存し、Picoと敵3種類を透過PNG化。素材の由来・寸法・アンカー・敵種別の対応は [素材記録](assets/characters/README.md) に記載。
- `character-assets.js` に画像読み込みと表示用キャッシュを追加。ロード中・失敗時も図形による代替表示で操作可能。
- `renderer.js` の自機と敵の本体描画を置換。Picoの頭部と敵コアを既存当たり判定の中心に配置。
- Pico周辺の光を黄金色へ変更。ヒット時は透過形状に沿った発光。敵の射出方向・発射予告・TARGET番号を維持。
- 画面下の自機の凡例を黄金色のPICO表記に変更。`astra.css` の変更はこの色の1行のみ。
- 大きさは960 × 600の論理座標で指定し、既存のCanvas拡縮とDPR対応を使用。画像の縦横比は保持。

`config.js`、`simulation.js`、`game.js`、`audio.js`、`styles.css`、`title-art.js` はアストラ版から差分なし。
TIME STOP、一筆書き、TARGET、EXECUTE、移動、敵AI、弾幕、衝突、WAVE、得点、LIFE、難易度を決めるコードと数値は変更していません。
敵弾自体の表示も保持しています。色の意味付けは今回のキャラクターと最小限の補助表示に適用しました。
HTML / Vanilla JavaScript / Canvasのみを使用し、新しい外部ランタイム依存はありません。

## 検証

WindowsのGoogle Chrome 152.0.7977.82を、開発用Playwrightから操作しました。Playwrightはゲームからは読み込みません。

| 検証 | 結果 |
| --- | --- |
| 既存ロジックテスト4ファイル | 57 / 57 PASS。停止、ルート、衝突、弾幕、得点、WAVE、リトライ |
| `tests/browser.cjs` | 31 / 31 PASS。Chrome実入力による全10 WAVE、57撃破、ONE STOP未完遂と同WAVE再挑戦、LIFE、終点到達 |
| 既存ブラウザ検証8本 | 全てPASS。操作説明、練習、TARGET、発火、音声終了処理、リザルト、複数回プレイ、リロード、低減モーション |
| `tests/pico-browser.cjs` | PASS。4素材ロード、alpha、四隅の完全透過、縦横比、頭部/コアのアンカー、全5パターン表示、当たり判定半径、描画前後のworld不変 |
| 画像の目視 | 暗色・明色の2背景に重ね、黒い背景・市松模様がないことを確認。原本とデザインを比較。通常・STOP・判定円を重ねたCanvas、実プレイのWAVE 10も確認 |
| TARGETと判定 | 5体の描画用検証シーンで5ロック、既存判定は自機9 / 敵15 / 弾5のまま。敵本体と10pxの弾を形・大きさで区別 |
| PCサイズ | 1920×1080 / 1600×900 / 1366×768 / 1280×720 / 960×720。同一ページのサイズ変更・マウス座標・画面内収まりを確認 |
| DPR 2 | 1280×720の追加素材検証、既存タッチ相当の検証もPASS。画像比率・中心位置を維持 |
| ロード遅延・失敗 | PNG取得中と4件の故意の取得失敗で、代替図形表示のまま開始可能。取得完了で画像へ復帰しWAVE・得点を維持 |
| `file://` | 4素材ロードとゲーム開始PASS |
| Console / JS error | 通常の検証セッションで0件。故意の画像取得失敗テストのみ、想定したネットワークエラー4件を別扱いで検証 |
| 外部リクエスト | 0件。ゲーム本体に外部ライブラリなし |

180弾の負荷測定：PCの描画p95は1.00ms、シミュレーション2ステップp95は0.10ms。
CPU 4倍低速・DPR 2の条件では4.20ms / 0.60msで、既存の16.7ms基準内でした。これはこのPCでの測定値です。

既存テストの合格条件は一切変更していません。主要ロジック・入力・音声ファイルはparentとのGit差分がないことも確認しました。
人の手による物理入力の操作感、実機スマートフォンは未検証です。最終の見た目の好み・採用判断はユーザーによる画面確認に委ねます。

証跡：`tests/artifacts/pico/acceptance.json`、透過比較と通常/STOP/判定円の画像、既存の `tests/artifacts/` と `tests/artifacts/astra/`。
これらは既存のignore設定に従いcommitには含めません。起動・再実行方法：

```powershell
python -m http.server 4186 --bind 127.0.0.1
```

別のPowerShellで、開発用Playwrightが利用できるNode環境から実行します。

```powershell
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs
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

## 変更ファイル

- `index.html`
- `renderer.js`
- `astra.css`（自機の凡例色の1行）
- `character-assets.js`（新規）
- `assets/characters/approved-reference.png`（添付原本）
- `assets/characters/pico.png`
- `assets/characters/enemy-01.png`
- `assets/characters/enemy-02.png`
- `assets/characters/enemy-03.png`
- `assets/characters/README.md`
- `tests/pico-browser.cjs`
- `TASK_A.md`

## 初心者向け：今回の作業前のアストラ版へ戻す

PowerShellを開き、最初に次の2行を実行します。

```powershell
cd .
git status
```

`nothing to commit, working tree clean` なら、次を実行します。

```powershell
git switch backup/deadline-astra-before-pico-20260906
```

`modified` や `Untracked files` があればそこで止め、「変更を保存してからアストラ版へ切り替えて」とCodexへ依頼してください。
強制切り替えや `reset --hard`、`git clean` は使いません。保存用branch上では編集しないでください。

切り替え後、同じフォルダーの `index.html` を開くか、ローカルサーバーのページを `Ctrl + Shift + R` で再読み込みします。

## TASK AのPico版に戻す

同じように変更がないことを確認してから実行します。

```powershell
git status
git switch codex/deadline-pico-world
```

ブラウザを再読み込みします。branchの切り替えでは、もう一方の版の保存済みcommitは消えません。
現在版のSHAは次のコマンドで確認できます。

```powershell
git branch --show-current
git rev-parse HEAD
git rev-parse HEAD^
```

アストラ改装より前の完成版へ戻す場合は、変更がない状態で `git switch backup/deadline-before-astra-20260906` を使います。
既存の詳しい手順は [RESTORE.md](RESTORE.md) にあります。
