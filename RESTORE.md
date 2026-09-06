# DEAD/LINEの安全な切り替え方

この改装では `main` へmergeしていません。ファイルの削除、reset、clean、履歴の書き換えもしていません。

## 保存してある版

| 版 | branch | commit |
| --- | --- | --- |
| Webページコンテスト・アストラ全面改装前の安全な完成版 | `backup/deadline-before-astra-20260906` | `c9276a0f97a2b0d000c2c0f3ad20b20ffcaffda6` |
| 元の完成版branch | `main` | 同じ `c9276a0f97a2b0d000c2c0f3ad20b20ffcaffda6` |
| 今回の改装版 | `codex/web-contest-astra-redesign` | 最終報告に記載。下記コマンドでも確認可能 |

元版は開始時点ですべてcommit済みだったため、内容のない保存commitは追加していません。既存commitをそのまま安全な基準点にしています。

## 元の完成版に戻す

ゲームを開いているブラウザをいったん閉じてから、PowerShellで一行ずつ実行します。

```powershell
cd D:\Desktop\AIWorkSpace\01_projects\web\deadline
git status
git switch backup/deadline-before-astra-20260906
```

`git status` が `nothing to commit, working tree clean` なら、保存済みで変更がない状態です。`modified` や `Untracked files` がある場合は、そこで止めて「現在の変更を保護してから元版へ切り替えて」とCodexへ依頼してください。エラーが出た場合も、強制切り替えや `reset --hard`、`clean` は使いません。

切り替えに成功したら、同じフォルダーの `index.html` を開くか、ローカルサーバーのページを再読み込みします。古い見た目が残る場合は `Ctrl + Shift + R` で再読み込みしてください。

`git switch` は、保存してある版へフォルダーの内容を切り替える操作です。改装版のcommitは残っています。保護用branch上での編集は避け、編集したくなったら新しいbranchの作成をCodexへ依頼してください。

## 改装版に戻す

同様に、変更がないことを確認してから実行します。

```powershell
cd D:\Desktop\AIWorkSpace\01_projects\web\deadline
git status
git switch codex/web-contest-astra-redesign
```

その後ブラウザを再読み込みします。

## 今開いている版を確認する

```powershell
git branch --show-current
git rev-parse HEAD
```

改装版の保存先commitだけを確認するには次を実行します。

```powershell
git rev-parse codex/web-contest-astra-redesign
```

## 作業フォルダー以外のバックアップ

`D:\Desktop\AIWorkSpace\backups\deadline-pre-astra-20260906` に次を保存しました。

- `deadline-before-astra.bundle`：改装前の全Git履歴・全参照。作成後に `git bundle verify` 成功。
- `deadline-working-files.zip`：`.git` 以外の作業ファイル全体。Git管理外の過去の検証画像も含みます。
- `RESTORE.md`：bundleから別フォルダーへ復元する手順。
- `title-before.png`、`game-before.png`：改装前の実Chrome画面。

ZIPはCRC検査に合格し、改装前の全追跡ファイル22件を含む計122ファイルが収録されていることを照合済みです。

bundleのSHA-256：`4EBB53C2AC8F5CA75D52D6882FB707729F89968950A8B094059C59A733C816C4`

ZIPのSHA-256：`63399BB2E46E1FA6A35214C642CAEB0392DEBDBD024E65FA91EAED06995012AA`

## GitHubと公開ページ

2026-09-06の開始時に `git ls-remote` でGitHubの `main` が元版commitと一致することを確認しました。

- remote：`https://github.com/homura-stack/deadline.git`
- merge・push・公開設定の変更：今回実施していません。
- ローカルでbranchを切り替えてもGitHub Pagesの公開版は変わりません。
- 元版はGitHubにも保存されています。今回の改装版はローカル保存です。

改装版もPC故障に備えてGitHubへ保管する場合は、**改装branchだけをpushする**のが適切です。公開branchへのmergeは別の操作です。必要なら「改装branchだけをpushして、mainへはmergeしないで」と依頼してください。
