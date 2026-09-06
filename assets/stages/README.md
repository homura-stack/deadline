# 正式ステージ背景 / TASK D

提供元：ユーザー指定 `D:\Desktop\DEADLINE`。2026-09-06に10枚のJPEGをそのままコピー。
再生成、描き直し、画像編集、再圧縮、形式変換は行っていません。
`manifest.json` に各ファイルの原寸・バイト数・SHA-256を記録しています。コピー先と提供元の全10件のハッシュ一致を確認済みです。

| AREA | WAVE | 戦闘 | 復旧後 |
| --- | --- | --- | --- |
| GARDEN / 蛍庭区 | 1–2 | garden_before.jpeg | garden_after.jpeg |
| FORGE / 機関区 | 3–4 | forge_before.jpeg | forge_after.jpeg |
| CANAL / 電流水路区 | 5–6 | canal_before.jpeg | canal_after.jpeg |
| SKYLINE / 天蓋区 | 7–8 | skyline_before.jpeg | skyline_after.jpeg |
| CORE / 中央核 | 9–10 | core_before.jpeg | core_after.jpeg |

`stage-art.js` が縦横比を保つ中央coverで960×600の論理フィールドへ配置します。
BEFOREだけに地区別14〜30%の暗い紺のオーバーレイをCanvasで重ねます。画像ファイルには保存しません。
AFTERは戦闘終了後のPico起点の柔らかな円形マスクだけで露出し、完了時は画像全体を不透明で描きます。
同一AREAのWAVE間、TIME STOP、EXECUTE中にAFTERを表示することはありません。

現在地区の2枚を読み込んでから戦闘を始め、戦闘中に次地区の2枚を先読みします。
保持する画像参照は現在・次地区の最大4枚。Canvas用の描画キャッシュは現在地区分だけで、ピクセル密度は最大2倍です。
高解像度JPEGを毎フレームリサイズ/フィルタ処理せず、地区・描画解像度の変更時にキャッシュを作り直します。
読み込み中は暗いエリア表示を保持して戦闘を止め、失敗時は再試行とTITLEを表示します。
