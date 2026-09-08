# 正式WORLD MAP素材

ユーザー指定のGemini生成JPEGをバイト単位でコピーした。再生成・再描画・再圧縮・切り抜きは行っていない。

| 使用ファイル | 元ファイル | 原寸 | ファイルサイズ | SHA-256 |
| --- | --- | --- | --- | --- |
| `before.jpeg` | `<local-asset-path>/完全復旧前WORLD MAP.jpeg` | 2752 × 1536 | 2,797,302 bytes | `dda4a2d70d7cfb28d8f286466c9af0c4484725b807afe7820b3abae78af7676a` |
| `after.jpeg` | `<local-asset-path>/完全復旧後WORLD MAP.jpeg` | 2750 × 1536 | 2,866,012 bytes | `6dd325544d929130d9ffaf98313c43aa37349995bb280fb31359d5ee2cecee30` |

`world-map.js`がBEFOREをHTML img、AFTERをSVG imageとして同じ表示領域へ載せる。AFTERの上書き範囲だけをSVGのalpha maskで制御する。ぼかすのはマスク境界であり、画像自体ではない。

2枚の横幅には2px（約0.073%）の差があるため、同じ正規化座標へ非破壊的に合わせる。表示幅は小さい方の2750pxを上限とし、通常のPC画面では縮小表示する。途中復旧・SYNC・ノード・ラベルは表示処理であり、JPEGに焼き込まない。

正式Pico画像・戦闘背景10枚・タイトル画像を併用する。素材はローカル配信し、外部サービスへ接続しない。
