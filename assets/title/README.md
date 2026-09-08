# 正式タイトル背景

## 現在の配信素材（TASK O）

- タイトル: `assets/title/title.png` — **1678 × 937** / PNG / **1,787,537 bytes**
- 提供元: `<local-download-path>/title.png`
- SHA-256: `5aab8b499f8ea84c645348cbdd9a06095f6b20f8305c2adbf5fa5f91a4fd65b9`
- 正式ロゴ原本（保存のみ）: `assets/title/logo.png` — **2172 × 724** / RGBA PNG / **855,084 bytes**
- 提供元: `<local-download-path>/logo.png`
- SHA-256: `c53c85065ee3b42c381922b7d1b364966710a47db133eee26eaea8ee941ecc5c`

両ファイルとも提供原本とバイト単位で同一。再生成・加工・再圧縮なし。
タイトルは完成ビジュアルをそのまま `object-fit: contain` で表示し、縦横比と原寸上限を維持する。
通常表示ではHTMLロゴやサブタイトルを重ねず、画像失敗時のみ既存の文字フォールバックを表示する。
狭い縦画面ではメニューを画像の下へ分離する。

### HUDは正式素材待ち

`logo-hud.png` は未提供・リポジトリにも存在しない。`logo.png` は左下のロゴ先端と日本語サブタイトルの高さが重なるため、
矩形切り出しでは「先端を欠損させず、字幕だけを除去する」ことができない。
不定形マスクによる境界の加工は正式デザインの品質を保証できないため実施していない。
HUDは既存文字表示を維持し、正式な透過PNG（メインロゴ＋星／軌道／下線、字幕なし）の提供後に差し替える。
`logo.png` 全体の縮小表示や代替デザインの制作は行わない。

## TASK G.1の旧配信素材（保持・現在未参照）

- 配信パス: `assets/title/pico-dead-circuit-original.jpeg`
- 提供元: ユーザー指定の `<local-asset-path>/タイトル.jpeg`
- 原寸: **2752 × 1536** / JPEG / **2,304,414 bytes**
- SHA-256: `db3cae82f0fde61644714aa92e2cadef661407e8d58acd40f0a99f15fc4df592`

元ファイルとコピー先はハッシュ・サイズが一致する。再圧縮・変換・再生成はしていない。`<img>`を`object-fit: contain`で直接表示し、CSSで縦横比と原寸上限を維持する。1920×1080のChromeでは1920×約1071.63 CSS px（約0.698倍）で表示する。Canvasへの再描画、blur、filter、透過overlayは使わない。

## TASK Gで提供された旧添付素材（保持・現在未参照）

- 配信パス: `assets/title/pico-dead-circuit.jpg`
- 提供元: ユーザー添付のGemini生成・正式タイトル画像
- 添付名: `codex-clipboard-b19e6f8f-1c80-4a8b-b0ee-2f6f289390c6.jpg`
- 原寸: **1024 × 572** / JPEG / **124,476 bytes**
- SHA-256: `a41694b88af44d79f420ec0f3a9c8a8db5a7418938744e3bd399fd0e2a20e839`

元ファイルをバイト単位で同一のままコピーした。再生成、再描画、画像へのUI焼き込み、再圧縮、画像編集は行っていない。画像内にDEAD/LINEのロゴと日本語・英語コピーがあるため、通常表示でHTMLの同じ文字を重ねない。

当時は`index.html`のタイトル内で読み込み、`title-pico.css`で縦横比を維持して配置した。PCでは全構図を画面内へ収め、狭い画面では画像とメニューを分けた。画像の切り抜きはしていない。ゲーム内の正式透過Pico `assets/characters/pico-final.png` とは用途を分け、そちらのゲーム内描画サイズ・anchorはTASK Oでも変更しない。

旧タイトル図 `title-art.js` と既存の画像はGit内に保持する。
