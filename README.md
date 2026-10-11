# 雀魂 運解析：配布物

個人用の牌譜解析アプリの配布物です。

- アプリ：https://akstnaaaaa99-glitch.github.io/mahjong_luck_analysis/app/
- 導入ページ（ユーザースクリプト・ブックマークレット）：https://akstnaaaaa99-glitch.github.io/mahjong_luck_analysis/install.html
- `poc/`：技術検証（PoC）で使った確認用ページ

牌譜の取り出しは、雀魂の牌譜画面でクライアントが受信したデータを読むだけで、雀魂への通信は追加しません。
解読部分のフィールド定義は shinkuan/Akagi の liqi.proto（Apache-2.0, Copyright 2026 Shinkuan）に、
アプリのシャンテン数の計算は mahjong（MIT, Copyright (c) 2017 mahjong Python library contributors）に基づきます。
詳細は THIRD_PARTY_NOTICES.md と app/THIRD_PARTY_NOTICES.md。
