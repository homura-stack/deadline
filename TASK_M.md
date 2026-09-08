# TASK M — Sound Envelope & Presence Pass

## 実装範囲

重要SEだけを Attack → short hold → 緩やかな胴体の減衰 → 短い終端減衰に変更した。共通 gain 4.0、Limiter曲線と接続順、MASTER／SFXのデフォルト80／90・保存・ミュート、個別SEの既存ピークgain、ゲームイベントの発音タイミングは変更していない。Wave・死亡時間・画面演出・操作は対象外。

READY、Near Miss、TIME STOP、UI、clock、draw、resume、CLEAR、PERFECTは従来の包絡を使用する。通常slashも変更していない。

## 包絡・音色の変更

時間の単位はms。holdはattack直後のピーク保持。body比率は終端releaseに入る直前のgain／ピークgain。終端は従来どおり0.0001へ指数減衰し、8ms後に音源を停止・解放する。

| SE | 主tone長 前→後 | noise長 前→後 | attack tone／noise | hold 前→後 | body比率 | 終端release |
|---|---:|---:|---:|---:|---:|---:|
| LOCK | 38→52 | 22→22 | 4／3 | 0→6 | .22 | 10 |
| EXECUTE | 85→125 | 105→145 | 4／3 | 0→24 | .28 | 24 |
| kill | 78→95 | 62→75 | 4／3 | 0→10 | .24 | 20 |
| final kill | 105→120 | 95→100 | 4／3 | 0→16 | .25 | 24 |
| damage | 85→120 | 60→85 | 1／1 | 0→18 | .28 | 24 |

- LOCK：45msの発音間隔制限を維持。toneを14msだけ延長し、noiseの長さは維持した。
- EXECUTE：既存の上昇sawtooth（120→760Hz）とhighpass noiseのまま、24msのholdと125／145msの主音で胴体を作った。
- kill：sineの98→38Hzを維持し、55msのtriangle（880→480Hz、attack 2ms）を追加。追加gainは低域gainの18%（0.0126）。
- final kill：sineの118→38Hzと従来の1.2倍係数を維持。70msのtriangle（1000→600Hz、attack 2ms）を追加し、gainは低域の20%（0.0168）。既存final slashを維持。
- damage：185→72Hzのtriangleとlowpass noiseを維持。1msのアタックを保ち、18msのholdを追加。主音120msで、300msヒットストップ全体を占有しない。
- 新しい調整値はすべてconfig.jsのfeedback.combatAudio.presenceへ集約。

個別ピークgainを上げていなくても、保持中の波形ピークや追加中域の合成により、実測の出力peakは上がる。目的はpeak正規化ではなく短い胴体の追加。

## 変更前後の測定

Chrome 152.0.7977.82 / OfflineAudioContext / 48kHz / MASTER 100 / SFX 100 / common gain 4.0。実際のSoundクラス、oscillator、noise、filter、Limiterを使用。Limiter前・後・MASTER後を別チャンネルで測定した。

変更前は本タスクの実装前に採取し、tests/fixtures/audio-m-baseline.jsonに固定。通常撃破の合成音hitも、保持していた変更前audio.jsを独立した測定ページに読み込んで追加計測した。既存のゲームファイルを旧版に書き戻す操作はしていない。

発音区間RMSの窓は「呼出時刻から最長voiceの停止予約（末尾8msを含む）まで」。固定窓RMSは呼出後50ms／100ms、無音も含む。数値は線形振幅（1.0がデジタルフルスケール）。初20ms比率は、レンダリングされた総エネルギーに占める割合。

| SE | final peak 前→後 | 発音区間RMS 前→後 | 初20msエネルギー 前→後 | 50ms RMS 前→後 | 100ms RMS 前→後 |
|---|---|---|---|---|---|
| LOCK | .1135→.1287 | .02124→.03741 | 99.67%→79.34% | .02038→.04098 | .01441→.02898 |
| EXECUTE | .1871→.2570 | .02576→.05611 | 88.80%→30.82% | .03866→.08282 | .02739→.06811 |
| kill単体 | .2247→.3331 | .05579→.11013 | 94.90%→53.63% | .07316→.15149 | .05174→.11177 |
| 通常撃破（slash＋kill） | .4648→.4786 | .06810→.11572 | 95.18%→57.38% | .08930→.15984 | .06315→.11744 |
| final kill（final slash含む） | .4546→.5391 | .07168→.14184 | 89.91%→40.88% | .10766→.20671 | .07619→.16041 |
| damage | .2053→.2314 | .05616→.07348 | 67.38%→43.92% | .07463→.10622 | .05416→.08311 |

発音区間：LOCK 46→60ms、EXECUTE 113→153ms、kill／通常撃破86→103ms、final113→128ms、damage93→128ms。

100ms固定窓ではEXECUTEはLOCKの約2.35倍RMS、finalは通常撃破合成音の約1.37倍RMS。これは物理的な音量階層の確認であり、PCスピーカーでの聴感や連続音の濁りを保証する値ではない。初20msの90%はテストの絶対合格条件にしていない。

## 実戦相当シナリオとLimiter

作動率はLimiter前の絶対振幅が0.8を超えたサンプルの割合。減衰dBはLimiter前後の発音区間RMS比。

| シナリオ | final peak 前→後 | 発音区間RMS 前→後 | 作動率 前→後 | RMS減衰 前→後 |
|---|---|---|---|---|
| 連続LOCK（50ms間隔×10） | .1202→.1287 | .02049→.04058 | 0%→0% | 約0→約0dB |
| EXECUTE→65ms後に通常撃破 | .5020→.5596 | .05754→.10601 | 0%→0% | 約0→約0dB |
| EXECUTE→10体連続撃破（40ms間隔、最後だけfinal） | .9305→.9305 | .08963→.17443 | .00774%→.00753% | −.257→−.073dB |
| Near Miss＋READY→10LOCK→EXECUTE→10撃破（25ms間隔）→PERFECT | .5932→.7566 | .06105→.11045 | 0%→0% | 約0→約0dB |
| damage＋READY | .3945→.4078 | .07478→.09109 | 0%→0% | 約0→約0dB |
| 非通常stress：final×10を同時＋damage＋READY | .9305→.9305 | .39652→.69725 | 13.93%→50.47% | −4.28→−6.02dB |

単音はすべて作動率0%。10体連続撃破では2サンプルだけ閾値を超えた（変更前も2サンプル）。この瞬間のLimiter前peakは2.6866→2.7875で、出力は既存の約.9305に制限される。通常シナリオで常時作動する状態ではないが、完全に無作動とは報告しない。

極端な同時重複では音の胴体が重なる分だけ抑制が増える。Limiterを再設計・変更していない。どのシナリオも最終peakは.95以下、非有限値なし、終了後のactiveVoicesは0。

## 回帰テスト

- TDD：追加Nodeテストの「holdなし」「kill中域なし」、追加Chromeテストの「RMS増加なし」が変更前に失敗することを確認してから実装。
- Node全件：98 / 98 PASS（既存94＋追加4）。
- 新規Chrome音声回帰：PASS。単音／連続イベントの計測、固定窓、対象外SEの不変、通常撃破とfinal双方の合成音の階層、Limiter、音源解放を確認。
- 既存Chrome音声出力テスト：PASS。common gain、MASTER／SFXゼロ、ピーク上限、既存イベント階層。
- Chrome全件：24 / 24スクリプト PASS（既存23＋追加1）。全件ランナーは失敗なし。通常撃破の合成音比較を追加した音声回帰も、その後の単独再実行でPASS。
- JavaScript構文確認、git diff --check：PASS（既存作業ツリーのCRLF警告のみ）。
- 保存・再読込・mute・AudioContext再開は既存Node／Chrome回帰でPASS。TRAINING、300ms被弾停止／650ms GAME OVER、先行リトライ、全Wave進行、救済、EXECUTE、マップ再挑戦も既存検証を通過。実機での聴感判定は別途必要。
- 全件結果：tests/artifacts/task-m/suite-logs/summary.json。追加音声計測の最終結果：tests/artifacts/task-m/audio-envelope.json。個別ログと既存テスト画像は従来のartifacts配下に出力する。

## 本タスクの変更ファイル

実装：audio.js、config.js。
テスト：tests/audio.test.cjs、tests/audio-metrics.cjs（追加）、tests/audio-envelope-browser.cjs（追加）、tests/fixtures/audio-m-baseline.json（追加）。
報告：TASK_M.md（本書）。
計測出力：tests/artifacts/task-m/audio-envelope.json、audio-output.json、suite-logs/（Git対象外）。

既存のTASK J/K/L変更を維持。既存テスト・素材の削除、外部ライブラリ追加、commit／pushは行っていない。

## 人間が確認すべき音

1. PCスピーカーでLOCKの輪郭が分かり、連続LOCKが濁らないか。
2. EXECUTEのアタックと短い胴体がLOCKより強く、直後のkillを隠さないか。
3. 通常killの低域の重量感と中域の輪郭が両立し、追加成分が耳障りでないか。
4. final killが通常撃破より明確に強く、10体連続撃破で歪みや音の団子化を感じないか。
5. damageが300msの白フラッシュ／停止の瞬間を支え、READYと重なっても区別できるか。

自動計測は存在感が増える構造と音量階層を示すが、聴感上の合格を代替しない。
