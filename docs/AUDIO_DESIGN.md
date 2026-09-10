# Sound Design & Verification

## 音声経路

現行のSEは[audio.js](../audio.js)のSoundクラスがWeb Audio APIで生成する。外部音源・音声ライブラリは使用しない。調整値は[config.js](../config.js)のaudioとfeedback.combatAudioに集約する。

各tone／noiseの包絡Gain → SFX音量 → 共通基準ゲイン4.0 → WaveShaperソフトリミッター → MASTER音量 → destination。

MASTER／SFXはUIの0〜100を内部で0〜1へ変換する。初期値は80／90、muteはMASTERを0にする。`deadline.audio.v1`で保存・再読込する。AudioContextはユーザー操作で開始／再開し、voice終了時にノードを切断・解放する。

リミッターは振幅0.8から滑らかに抑制し、設定上限0.95へ収める。DynamicsCompressorNodeは使用しない。下記peak／RMSはMASTER 100／SFX 100時で、初期音量設定での測定ではない。

## 包絡設計の意図

重要SEだけAttack → short hold → body decay → releaseを使い、ピークgainの一律増加ではなくアタック後の短い胴体を作る。LOCKの45ms間隔制限を維持する。killは低域の重量を残し、中域を追加して小型スピーカーでも輪郭を認識しやすくする。

READY、Near Miss、TIME STOP、UI、clock、draw、resume、CLEAR、PERFECT、通常slashはこの長い包絡の対象外。Near Missの70ms発音間隔制限も維持する。

以下の「前→後」はRC1以前の包絡改修時の比較記録であり、現在の実行環境で再計測した結果ではない。

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

変更前は包絡改修前に採取し、tests/fixtures/audio-m-baseline.jsonに固定。通常撃破の合成音hitも、保持していた変更前audio.jsを独立した測定ページに読み込んで追加計測した。

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


## 再計測・回帰テスト

- [audio.test.cjs](../tests/audio.test.cjs)：音声API、設定、voice管理と包絡スケジュール。
- [audio-output-browser.cjs](../tests/audio-output-browser.cjs)：共通gain、Limiter、ゼロ音量、イベント階層。
- [audio-envelope-browser.cjs](../tests/audio-envelope-browser.cjs)：実AudioNodeによる包絡・RMS・音量階層・重複発音・音源解放。
- [audio-metrics.cjs](../tests/audio-metrics.cjs)：OfflineAudioContextの測定ヘルパー。
- [audio-m-baseline.json](../tests/fixtures/audio-m-baseline.json)：改修前の固定比較値。

[READMEのテスト準備](../README.md#テスト)を済ませ、HTTPサーバー起動後に実行する。

```sh
node --test tests/audio.test.cjs
node tests/audio-output-browser.cjs
node tests/audio-envelope-browser.cjs
```

結果はGit管理外の`tests/artifacts/audio-envelope/`等へ出力される。共通gainやLimiterを変更せず、単音、連続LOCK、EXECUTEから通常撃破、10体連続撃破、final、damage＋READY、非通常stressを区別して評価する。

「最初の20msに90%以上集中しない」は設計目安で、絶対的合否条件ではない。LOCKよりEXECUTE、通常撃破よりfinalを強く認識できるか、連続音が濁らないかはPCスピーカー等で聴取する。自動計測は聴感・実機の合格を代替しない。
