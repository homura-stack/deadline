# Route Planner Test Specification

`tests/route-planner.cjs`は、ブラウザ回帰で安全なDRAW経路を探索するテスト専用モジュールです。ゲーム本体はこの探索器を読み込まず、衝突判定には`simulation.js`の幾何関数を使用します。

## 探索領域

- 論理フィールドは960 × 600、プレイ可能範囲は`x=24..936`、`y=24..576`です。
- 探索格子の間隔は16pxです。
- フィールド幅・高さが16pxで割り切れない場合も、右端と下端を候補点に含めます。特に`y=576`を含めることで、下端付近の有効な退避経路を探索できます。
- 格子点間は8方向に接続し、各線分を弾との衝突判定に通します。探索後は安全性を保ったまま不要な中間点を省きます。

## 弾とのクリアランス

実際の接触半径は、Picoの半径9pxと弾の半径5pxを合わせた14pxです。経路探索では通常、この半径に3pxを加えた17pxを安全余白として使います。

NEAR MISS直後のPicoは、接触半径14pxの外側かつ探索余白17pxの内側にいる場合があります。この状態を探索余白だけで閉じ込めないため、出発点を囲む弾に限り、クリアランスを出発時距離まで縮めます。ただし実接触半径14pxを下回る経路は常に拒否します。ほかの弾には17pxの余白を適用します。

## 回帰fixture

- `tests/fixtures/wave7-grid-trap.json`: 下端`y=576`を経由できないと探索が失敗するWave 7状態。
- `tests/fixtures/wave7-padding-trap.json`: Picoが14〜17pxのNEAR MISS範囲から開始するWave 7状態。

`tests/route-planner.test.cjs`は次を検証します。

1. 下端を経由する経路がプレイ範囲と17px余白を守る。
2. 実接触半径内から始まる状態では経路を返さない。
3. 14〜17pxの開始状態から安全に離脱できる。
4. 両fixtureで全5体をLOCKし、危険区間0・被弾0でWaveを完了できる。
5. fixtureデータを探索やsimulationが変更しない。

## 回帰確認

```sh
node --test tests/route-planner.test.cjs
node tests/campaign-waves-browser.cjs
```
