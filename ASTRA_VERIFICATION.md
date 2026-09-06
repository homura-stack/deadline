# アストラ改装版の検証記録

実施日：2026-09-06。Windows上の **Google Chrome 152.0.7977.82** をPlaywrightから操作して確認。

## ゲーム性の保持

`git diff c9276a0f97a2b0d000c2c0f3ad20b20ffcaffda6 -- simulation.js config.js audio.js` は差分なし。元版の入力処理も維持し、`game.js` の変更は描画専用状態の追加と演出イベントへの接続のみです。

| テスト | 結果・確認範囲 |
| --- | --- |
| Nodeロジック4ファイル | **57 / 57 PASS**。衝突、停止、ルート生成、ロック順、発火、弾幕、Wave、リトライ、得点 |
| `tests/browser.cjs` | **31 / 31 PASS**。実入力によるゲージ蓄積・危険区間・UNDO/CLEAR/CANCEL・安全経路・失敗と再挑戦・全10 Wave |
| 10 Wave通しプレイ | **18,400点 / 57撃破 / 最大連鎖10 / PERFECT 5回 / 被弾0**。途中でWave 7の未完遂と同Wave再挑戦も確認 |
| `tests/title-browser.cjs` | 7サイズのタイトル・設定・説明・リザルト。初回起動、4ページ説明、SPACE、設定復元、低減モーション |
| `tests/tutorial-touchpad-browser.cjs` | 同期SVGの入力デモ、PC練習、タッチ相当の練習完走、MOVE PADの継続描画、7サイズ |
| `tests/route-visual-browser.cjs` | 2体ロック、終点までの実行、低減モーションで経路描画が静止すること |
| `tests/execute-feedback-browser.cjs` | 1体・3体への連続発火、SE順序、短い溜め、時刻音の解除、音声ノードと残像の後始末 |
| `tests/final-polish-mobile-browser.cjs` | 設定→説明→MOVE PAD操作、Canvas直接タッチとの分離 |
| `tests/barrage-browser.cjs` | 180弾の隔離負荷テスト。PCとCPU 4倍低速・DPR 2のタッチ相当環境 |
| `tests/astra-browser.cjs` | 1920×1080で2回連続の練習・失敗・同Wave再挑戦・TITLE復帰。5種類のリサイズと座標、リロード |

## 改装した描画の追加チェック

- 40フレームの停止・実行中描画で、描画前後のゲーム状態のJSONが一致。描画によるゲーム状態変更 **0件**。
- 2体撃破の実入力で750点、最後に描いた終点と実際の到達点が1px未満で一致。
- 発火と実行後の余韻を実フレームからPNGで採取。得点表示と経路の余韻は規定時間後に消え、リトライへ持ち越さない。
- 隔離描画fixtureの実ピクセル：安全な経路 `RGB(226,255,242)`、危険区間 `RGB(255,141,146)`、停止した実弾 `RGB(221,203,180)`。色の差と弾の明るさを確認。
- `prefers-reduced-motion: reduce` のタイトルCanvasは時間を置いたスクリーンショットが一致。
- Chromeの **console error / pageerror 0件**。実行時の外部リクエスト **0件**。
- `file://` 起動を確認。通常URLではdebug UI・検証用inspect APIを表示しない。

## 画面サイズ

PCの追加確認：**1920×1080、1600×900、1366×768、1280×720、960×720**。同じアプリを起動したままサイズ変更し、横はみ出しなし、操作ボタンとフッターが画面内、マウス座標の一致を確認しました。

既存検証の追加対象：390×844、844×390、320×800、360×800、768×800。44px以上のタッチ操作領域を維持。これはWindows Chromeのタッチエミュレーションで、実機の確認ではありません。

## 負荷の測定結果

| 条件 | 描画p95 | シミュレーション2ステップp95 | 512点の経路計算p95 |
| --- | --- | --- | --- |
| PC、180弾 | 1.10ms | 0.20ms | 4.70ms |
| CPU 4倍低速 / DPR 2、180弾 | 3.90ms | 0.70ms | 17.20ms |

実弾18発の場面で3体へ発火した計測はフレーム間隔p95 **17.0ms**、音声の終了後の残存ノード0。PC入力のrAF標本は約60fps。これらは今回のローカル環境の測定値で、すべてのPCでの性能を保証するものではありません。

## 見つけて直した点

- 時間停止の開始フラッシュ：全面の光が盤面の暗転を打ち消していたため、自機の周囲だけの光に変更。
- 768px幅の盤面：新しい余白が広すぎたため、画面幅に合わせて縮小。
- リザルトの開始：Canvasのフォーカス枠が横線として見えていたため、リザルト中だけ抑制。
- 旧タイトル画像の縦横比・旧配色を固定したテスト：新しい文字の配置・ボタンとの分離・配色を検証する内容へ更新。ロジックの合格条件は変更していない。

## 証跡と再実行

画像・JSON：`tests/artifacts/astra/`。従来のブラウザ検証結果は `tests/artifacts/`。これらは元の `.gitignore` に従いcommit対象外です。既存の検証成果物は改装前ZIPに保存済みです。

```powershell
python -m http.server 4186 --bind 127.0.0.1
```

別のPowerShellで、Playwrightが利用できるNode環境から実行します。今回の検証ではCodex同梱のPlaywrightを `NODE_PATH` で指定して使用し、ゲームへ依存を追加していません。

```powershell
node --test tests/simulation.test.cjs tests/loop.test.cjs tests/barrage.test.cjs tests/waves.test.cjs
node tests/browser.cjs
node tests/title-browser.cjs
node tests/tutorial-touchpad-browser.cjs
node tests/route-visual-browser.cjs
node tests/execute-feedback-browser.cjs
node tests/final-polish-mobile-browser.cjs
node tests/barrage-browser.cjs
node tests/astra-browser.cjs
```

未実施：人の手による物理マウス・キーボードでの主観的な操作感とスピーカーの聴感、実機スマートフォン、主催者の最新規約本文との照合。ゲーム本体は依頼文で指定された外部依存禁止条件を満たしています。

## Gitの提出範囲

変更対象は次の13ファイルに限定しています。

`README.md`、`ASTRA_VERIFICATION.md`、`REDESIGN.md`、`RESTORE.md`、`index.html`、`astra.css`、`title-art.js`、`game.js`、`renderer.js`、`tests/astra-browser.cjs`、`tests/browser.cjs`、`tests/title-browser.cjs`、`tests/tutorial-touchpad-browser.cjs`。

元版branch・元commit・旧素材は保持。削除・merge・pushは実施していません。最終SHAとcommit後のGit状態は最終報告に記載します。
