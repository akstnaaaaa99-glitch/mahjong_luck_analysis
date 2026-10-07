# 雀魂 運解析 PoC：配布物

個人用の牌譜解析アプリの技術検証（PoC）で使う配布物です。導入は [install.html](https://akstnaaaaa99-glitch.github.io/mahjong_luck_analysis/install.html) から。

雀魂の牌譜画面で、クライアントが受信した牌譜を天鳳JSONに変換します（雀魂への通信は追加しません）。
`mlk-extract*.js` の解読部分のフィールド定義は shinkuan/Akagi の liqi.proto（Apache-2.0, Copyright 2026 Shinkuan）に基づきます。
