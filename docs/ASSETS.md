# Asset Specifications and Credits

この文書は、配信画像の寸法、描画基準、当たり判定との関係、キャッシュ方針をまとめた技術資料です。

## クレジットと利用条件

- WORLD MAPの`before.jpeg`と`after.jpeg`は、生成ツールとしてGeminiを使用しています。
- 敵キャラクター3点は、1枚の集合画像から背景を除去し、透過PNGとして分割した派生素材です。
- そのほかのタイトル、Pico、ステージ画像について、生成手段や第三者ライセンスの情報はリポジトリ内に記録されていません。
- このリポジトリには明示的なオープンソースライセンスを設定していません。コード・画像の再利用条件は作者へ確認してください。

## キャラクター

### Pico

| ファイル | 原寸・形式 | 表示 | anchor x / y | 判定半径 | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| `assets/characters/pico-final.png` | 1295 × 1214 / RGBA PNG | 幅48、高さ約45.0 | .56 / .47 | 9 | `df2d8295764d489b79b41bd079e5b554f7f601138bdbc4bd436923ae059d3faf` |

通常戦闘、TRAINING、EXECUTE、被弾、LIGHT RESTORED、WORLD MAPで同じ画像を使用します。判定半径は羽や触角を含む画像外形より小さく、発光コア付近を基準にします。

### 敵キャラクター

集合画像のSHA-256は`3c3453770419c20dd90cd2afed8c3527dfeaf01689f1f25c416c8d48a9ba3c51`です。

| ファイル | 外観 | 原寸 | 表示幅 | anchor x / y | 攻撃タイプ |
| --- | --- | --- | ---: | --- | --- |
| `enemy-01.png` | 赤コア・球体・棘 | 1254 × 1254 | 52 | .499 / .478 | AIM / FAN以外のBURST |
| `enemy-02.png` | シアンコア・三角形 | 1536 × 1024 | 52 | .5 / .555 | AIM / FAN |
| `enemy-03.png` | 紫コア・四枚の羽 | 1254 × 1254 | 50 | .504 / .482 | ROTATE / DELAY |

敵の判定半径は15です。表示高さは縦横比から算出し、anchorで発光コアをゲーム座標へ合わせます。ENEMY 02はTARGET表示のシアンと区別するため、描画キャッシュの生成時だけ色相を変更します。

4画像は通常表示用とヒット発光用の小さなCanvasへキャッシュします。PNGのalphaと縦横比を保持し、画像の読み込み中または失敗時はベクター図形へフォールバックします。画像読み込みはsimulationの時間進行を待機させません。

## ステージ背景

ファイルごとの原寸、バイト数、SHA-256は[`assets/stages/manifest.json`](../assets/stages/manifest.json)を正とします。

| AREA | WAVE | 戦闘 | 復旧後 |
| --- | --- | --- | --- |
| GARDEN / 蛍庭区 | 1–2 | `garden_before.jpeg` | `garden_after.jpeg` |
| FORGE / 機関区 | 3–4 | `forge_before.jpeg` | `forge_after.jpeg` |
| CANAL / 電流水路区 | 5–6 | `canal_before.jpeg` | `canal_after.jpeg` |
| SKYLINE / 天蓋区 | 7–8 | `skyline_before.jpeg` | `skyline_after.jpeg` |
| CORE / 中央核 | 9–10 | `core_before.jpeg` | `core_after.jpeg` |

`stage-art.js`は縦横比を保つ中央coverで、画像を960 × 600の論理フィールドへ配置します。BEFOREには地区別14〜30%の暗い紺のオーバーレイをCanvasで重ねます。AFTERは戦闘終了後、Picoを起点とする円形マスクで露出し、演出完了時に画像全体を表示します。

戦闘開始前に現在地区の2枚を読み込み、戦闘中に次地区の2枚を先読みします。保持する画像参照は現在・次地区の最大4枚です。Canvas描画キャッシュは現在地区分だけを保持し、ピクセル密度は最大2倍です。地区または描画解像度が変わった時だけキャッシュを再構築します。

読み込み中は暗いエリア表示を保って戦闘開始を待機し、失敗時は再試行とTITLEへの導線を表示します。

## タイトル

| 用途 | ファイル | 原寸・形式 | バイト数 | SHA-256 |
| --- | --- | --- | ---: | --- |
| タイトル画面 | `assets/title/title.png` | 1678 × 937 / PNG | 1,787,537 | `5aab8b499f8ea84c645348cbdd9a06095f6b20f8305c2adbf5fa5f91a4fd65b9` |
| ロゴ資料 | `assets/title/logo.png` | 2172 × 724 / RGBA PNG | 855,084 | `c53c85065ee3b42c381922b7d1b364966710a47db133eee26eaea8ee941ecc5c` |

タイトル画像は`object-fit: contain`で表示し、縦横比と原寸上限を保ちます。通常表示では画像内のロゴとサブタイトルを使い、画像の読み込みに失敗した場合だけHTMLの文字フォールバックを表示します。狭い縦画面ではメニューを画像の下へ分離します。

## WORLD MAP

| ファイル | 原寸 | バイト数 | SHA-256 |
| --- | --- | ---: | --- |
| `assets/world-map/before.jpeg` | 2752 × 1536 | 2,797,302 | `dda4a2d70d7cfb28d8f286466c9af0c4484725b807afe7820b3abae78af7676a` |
| `assets/world-map/after.jpeg` | 2750 × 1536 | 2,866,012 | `6dd325544d929130d9ffaf98313c43aa37349995bb280fb31359d5ee2cecee30` |

2枚の横幅には2px、約0.073%の差があります。`world-map.js`は小さい方の2750pxを表示上限とし、両画像を同じ正規化座標へ合わせます。

BEFOREはHTMLの`img`、AFTERはSVGの`image`として同じ表示領域に重ねます。復旧範囲はSVGのalpha maskで制御し、ぼかしは画像ではなくマスク境界に適用します。途中復旧、SYNC、ノード、ラベルは描画時に合成します。

画像、マスク、ビーコン、クリック領域は同じアスペクト比と正規化座標を共有します。素材はすべてローカル配信し、ゲーム実行中に外部画像サービスへ接続しません。
