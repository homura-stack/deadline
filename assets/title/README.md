# 正式タイトル背景

## 現在の配信素材（TASK G.1）

- 配信パス: `assets/title/pico-dead-circuit-original.jpeg`
- 提供元: ユーザー指定の `D:/Desktop/DEADLINE/タイトル.jpeg`
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

`index.html`のタイトル内で読み込み、`title-pico.css`で縦横比を維持して配置する。PCでは全構図を画面内へ収め、狭い画面では画像とメニューを分ける。画像の切り抜きはしていない。ゲーム内の正式透過Pico `assets/characters/pico-final.png` とは用途を分け、そちらの画像・描画サイズ・anchorは変更しない。

旧タイトル図 `title-art.js` と既存の画像はGit内に保持する。
