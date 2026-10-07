# 第三者の著作物について

## Akagi（Apache License 2.0）

- 出典: https://github.com/shinkuan/Akagi の `src/bridge/majsoul/proto/liqi.proto`
  （参照したコミット: `8cf541a725d3`、2026-09-23）
- 著作権表示: Akagi v3 / Copyright 2026 Shinkuan
- ライセンス: Apache License 2.0（全文は `licenses/Akagi-LICENSE.txt`）
- 利用箇所: `src/pb.js` の `SCHEMA`。牌譜の解読に必要なメッセージについて、フィールド名・フィールド番号・型だけを抜き出し、
  JavaScript のオブジェクトとして書き直した（変更あり）。liqi.proto のファイルそのものは同梱していない。
- `src/pb.js` の `xorDecode` は、Akagi の `src/bridge/majsoul/README.md` に記載された XOR の手順を参考に実装した。

## 参考にしたが、コードは利用していないもの

| 名前 | ライセンス | 参考にした内容 |
| --- | --- | --- |
| Equim-chan/tensoul | MIT（ただし変換部分は downloadlogs.js 由来と明記） | 天鳳形式の局データの構成 |
| vg-mjg/majsoul-plus-mods の downloadlogs | 表記なし | 同上 |
| 雀魂牌譜検討サポーター（MJRS） | 表記なし | WebSocket の送受信を観察して fetchGameRecord の応答を取り出す、という方式 |
