(function(){/* 雀魂 運解析 PoC（牌譜取り出し）。pb.js のフィールド定義は shinkuan/Akagi の liqi.proto （Apache-2.0, Copyright 2026 Shinkuan）に基づく。詳細は THIRD_PARTY_NOTICES.md */
var MLK_PB = (function () {
'use strict';
var SCHEMA = {
Wrapper: { 1: ['name', 'string'], 2: ['data', 'bytes'] },
ReqGameRecord: { 1: ['game_uuid', 'string'], 2: ['client_version_string', 'string'] },
ResGameRecord: { 1: ['error', 'Error'], 3: ['head', 'RecordGame'], 4: ['data', 'bytes'], 5: ['data_url', 'string'] },
Error: { 1: ['code', 'uint32'], 6: ['message', 'string'] },
RecordGame: {
1: ['uuid', 'string'], 2: ['start_time', 'uint32'], 3: ['end_time', 'uint32'],
5: ['config', 'GameConfig'], 11: ['accounts', 'AccountInfo', true],
12: ['result', 'GameEndResult'], 13: ['robots', 'AccountInfo', true]
},
AccountInfo: { 1: ['account_id', 'uint32'], 2: ['seat', 'uint32'], 3: ['nickname', 'string'], 7: ['level', 'AccountLevel'] },
AccountLevel: { 1: ['id', 'uint32'], 2: ['score', 'uint32'] },
GameConfig: { 1: ['category', 'uint32'], 2: ['mode', 'GameMode'], 3: ['meta', 'GameMetaData'] },
GameMode: { 1: ['mode', 'uint32'], 4: ['ai', 'bool'], 6: ['detail_rule', 'GameDetailRule'] },
GameMetaData: { 1: ['room_id', 'uint32'], 2: ['mode_id', 'uint32'], 3: ['contest_uid', 'uint32'] },
GameDetailRule: { 3: ['dora_count', 'uint32'], 5: ['init_point', 'uint32'] },
GameEndResult: { 1: ['players', 'PlayerItem', true] },
PlayerItem: { 1: ['seat', 'uint32'], 2: ['total_point', 'int32'], 3: ['part_point_1', 'int32'] },
GameDetailRecords: { 1: ['records', 'bytes', true], 2: ['version', 'uint32'], 3: ['actions', 'GameAction', true] },
GameAction: { 1: ['passed', 'uint32'], 2: ['type', 'uint32'], 3: ['result', 'bytes'] },
LiQiSuccess: { 1: ['seat', 'uint32'], 2: ['score', 'int32'], 3: ['liqibang', 'uint32'], 4: ['failed', 'bool'] },
RecordNewRound: {
1: ['chang', 'uint32'], 2: ['ju', 'uint32'], 3: ['ben', 'uint32'], 4: ['dora', 'string'],
5: ['scores', 'int32', true], 6: ['liqibang', 'uint32'],
7: ['tiles0', 'string', true], 8: ['tiles1', 'string', true], 9: ['tiles2', 'string', true], 10: ['tiles3', 'string', true],
13: ['md5', 'string'], 14: ['paishan', 'string'], 15: ['left_tile_count', 'uint32'], 16: ['doras', 'string', true],
22: ['sha256', 'string'], 24: ['saltSha256', 'string'], 25: ['salt', 'string']
},
RecordDealTile: {
1: ['seat', 'uint32'], 2: ['tile', 'string'], 3: ['left_tile_count', 'uint32'],
5: ['liqi', 'LiQiSuccess'], 6: ['doras', 'string', true]
},
RecordDiscardTile: {
1: ['seat', 'uint32'], 2: ['tile', 'string'], 3: ['is_liqi', 'bool'], 5: ['moqie', 'bool'],
8: ['doras', 'string', true], 9: ['is_wliqi', 'bool']
},
RecordChiPengGang: {
1: ['seat', 'uint32'], 2: ['type', 'uint32'], 3: ['tiles', 'string', true], 4: ['froms', 'uint32', true],
5: ['liqi', 'LiQiSuccess']
},
RecordAnGangAddGang: { 1: ['seat', 'uint32'], 2: ['type', 'uint32'], 3: ['tiles', 'string'], 6: ['doras', 'string', true] },
RecordBaBei: { 1: ['seat', 'uint32'], 6: ['doras', 'string', true], 8: ['moqie', 'bool'] },
RecordHule: {
1: ['hules', 'HuleInfo', true], 2: ['old_scores', 'int32', true], 3: ['delta_scores', 'int32', true],
5: ['scores', 'int32', true], 7: ['doras', 'string', true], 9: ['baopai', 'int32']
},
HuleInfo: {
1: ['hand', 'string', true], 2: ['ming', 'string', true], 3: ['hu_tile', 'string'], 4: ['seat', 'uint32'],
5: ['zimo', 'bool'], 6: ['qinjia', 'bool'], 7: ['liqi', 'bool'], 8: ['doras', 'string', true],
9: ['li_doras', 'string', true], 10: ['yiman', 'bool'], 11: ['count', 'uint32'], 12: ['fans', 'FanInfo', true],
13: ['fu', 'uint32'], 15: ['point_rong', 'uint32'], 16: ['point_zimo_qin', 'uint32'],
17: ['point_zimo_xian', 'uint32'], 19: ['point_sum', 'uint32'], 21: ['baopai', 'uint32'],
22: ['baopai_seats', 'uint32', true]
},
FanInfo: { 1: ['name', 'string'], 2: ['val', 'uint32'], 3: ['id', 'uint32'] },
RecordNoTile: {
1: ['liujumanguan', 'bool'], 2: ['players', 'NoTilePlayerInfo', true], 3: ['scores', 'NoTileScoreInfo', true]
},
NoTilePlayerInfo: { 3: ['tingpai', 'bool'], 4: ['hand', 'string', true] },
NoTileScoreInfo: { 1: ['seat', 'uint32'], 2: ['old_scores', 'int32', true], 3: ['delta_scores', 'int32', true] },
RecordLiuJu: { 1: ['type', 'uint32'], 3: ['seat', 'uint32'], 4: ['tiles', 'string', true], 5: ['liqi', 'LiQiSuccess'] }
};
var SCALARS = { string: 1, bytes: 1, uint32: 1, int32: 1, bool: 1 };
var utf8 = new TextDecoder('utf-8');
function Reader(buf) { this.buf = buf; this.pos = 0; }
Reader.prototype.varint = function () {
var lo = 0, hi = 0, shift = 0, b;
do {
if (this.pos >= this.buf.length) throw new Error('varint が途中で終わっている');
b = this.buf[this.pos++];
if (shift < 28) lo |= (b & 0x7f) << shift;
else if (shift === 28) { lo |= (b & 0x0f) << 28; hi |= (b & 0x7f) >>> 4; }
else hi |= (b & 0x7f) << (shift - 32);
shift += 7;
if (shift > 70) throw new Error('varint が長すぎる');
} while (b & 0x80);
return { lo: lo >>> 0, hi: hi >>> 0 };
};
Reader.prototype.bytes = function () {
var len = this.varint().lo;
if (this.pos + len > this.buf.length) throw new Error('長さ付きフィールドがデータ末尾を超えている');
var out = this.buf.subarray(this.pos, this.pos + len);
this.pos += len;
return out;
};
Reader.prototype.skip = function (wireType) {
if (wireType === 0) this.varint();
else if (wireType === 1) this.pos += 8;
else if (wireType === 2) this.bytes();
else if (wireType === 5) this.pos += 4;
else throw new Error('未対応の wire type: ' + wireType);
};
function scalarFromVarint(type, v) {
if (type === 'uint32') return v.lo;
if (type === 'int32') return v.lo | 0;
if (type === 'bool') return v.lo !== 0;
throw new Error('varint で読めない型: ' + type);
}
function defaults(spec) {
var obj = {};
Object.keys(spec).forEach(function (no) {
var f = spec[no];
if (f[2]) obj[f[0]] = [];
else if (f[1] === 'string') obj[f[0]] = '';
else if (f[1] === 'bytes') obj[f[0]] = new Uint8Array(0);
else if (f[1] === 'bool') obj[f[0]] = false;
else if (SCALARS[f[1]]) obj[f[0]] = 0;
else obj[f[0]] = null;
});
return obj;
}
function decode(typeName, buf) {
var spec = SCHEMA[typeName];
if (!spec) throw new Error('未定義のメッセージ: ' + typeName);
var r = new Reader(buf);
var obj = defaults(spec);
while (r.pos < buf.length) {
var key = r.varint().lo;
var no = key >>> 3, wt = key & 7;
var f = spec[no];
if (!f) { r.skip(wt); continue; }
var name = f[0], type = f[1], repeated = f[2];
var val;
if (type === 'string') val = utf8.decode(r.bytes());
else if (type === 'bytes') val = r.bytes();
else if (SCALARS[type]) {
if (wt === 2 && repeated) {
var sub = new Reader(r.bytes());
while (sub.pos < sub.buf.length) obj[name].push(scalarFromVarint(type, sub.varint()));
continue;
}
val = scalarFromVarint(type, r.varint());
} else val = decode(type, r.bytes());
if (repeated) obj[name].push(val); else obj[name] = val;
}
return obj;
}
var XOR_KEYS = [0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c];
function xorDecode(data) {
var out = new Uint8Array(data.length);
var base = 23 ^ data.length;
for (var i = 0; i < data.length; i++) out[i] = data[i] ^ ((base + 5 * i + XOR_KEYS[i % 9]) & 0xff);
return out;
}
function decodeRecordWrapper(bytes, warnings) {
var w = decode('Wrapper', bytes);
var type = w.name.replace(/^\.lq\./, '');
if (!SCHEMA[type]) {
warnings.push('未対応のレコード型: ' + w.name);
return { _type: type };
}
var rec;
try {
rec = decode(type, w.data);
} catch (e) {
rec = decode(type, xorDecode(w.data));
warnings.push('XOR を外して解読した: ' + type);
}
rec._type = type;
return rec;
}
function decodeGameRecord(resBytes) {
var warnings = [];
var res = decode('ResGameRecord', resBytes);
if (res.error && res.error.code) throw new Error('雀魂がエラーを返した: code=' + res.error.code);
if (!res.head) throw new Error('牌譜のヘッダがない');
if (!res.data.length) {
throw new Error(res.data_url ? '古い形式の牌譜（data_url）には対応していない' : '牌譜の本体が空');
}
var detailWrapper = decode('Wrapper', res.data);
var detail = decode('GameDetailRecords', detailWrapper.data);
var items;
if (detail.version < 210715 && detail.records.length) items = detail.records;
else items = detail.actions.filter(function (a) { return a.result.length; }).map(function (a) { return a.result; });
var records = items.map(function (b) { return decodeRecordWrapper(b, warnings); });
return { head: res.head, version: detail.version, records: records, warnings: warnings };
}
var FRAME = { NOTIFY: 1, REQUEST: 2, RESPONSE: 3 };
function parseFrame(u8) {
if (!u8 || u8.length < 1) return null;
var kind = u8[0];
if (kind === FRAME.NOTIFY) return { kind: kind, index: null, body: u8.subarray(1) };
if ((kind === FRAME.REQUEST || kind === FRAME.RESPONSE) && u8.length >= 3) {
return { kind: kind, index: u8[1] | (u8[2] << 8), body: u8.subarray(3) };
}
return null;
}
return {
SCHEMA: SCHEMA, FRAME: FRAME, decode: decode, decodeGameRecord: decodeGameRecord,
parseFrame: parseFrame, xorDecode: xorDecode
};
})();
var MLK_CONVERT = (function () {
'use strict';
var TSUMOGIRI = 60;
var MLK_EXT_VERSION = 1;
function tileCode(s) {
var n = parseInt(s.charAt(0), 10);
var suit = { m: 1, p: 2, s: 3, z: 4 }[s.charAt(1)];
if (isNaN(n) || !suit) throw new Error('不明な牌: ' + s);
return n === 0 ? 50 + suit : suit * 10 + n;
}
function plain(code) { return code > 50 ? (code - 50) * 10 + 5 : code; }
function removeTile(hand, code, warnings, where) {
var i = hand.indexOf(code);
if (i < 0) {
warnings.push(where + ': 手牌に ' + code + ' がない');
return;
}
hand.splice(i, 1);
}
function relative(seat, from) { return (seat - from + 4) % 4; }
function scoreLabel(h) {
var points;
if (!h.zimo) points = h.point_rong + '点';
else if (h.qinjia) points = h.point_zimo_xian + '点∀';
else points = h.point_zimo_xian + '-' + h.point_zimo_qin + '点';
if (h.yiman) return '役満' + points;
if (h.count >= 13) return '数え役満' + points;
if (h.count >= 11) return '三倍満' + points;
if (h.count >= 8) return '倍満' + points;
if (h.count >= 6) return '跳満' + points;
if (h.count >= 5 || (h.count >= 4 && h.fu >= 40) || (h.count >= 3 && h.fu >= 70)) return '満貫' + points;
return h.fu + '符' + h.count + '飜' + points;
}
function yakuLabels(h) {
return h.fans.map(function (f) {
var name = f.name || ('役ID' + f.id);
return name + '(' + (h.yiman ? '役満' : f.val + '飜') + ')';
});
}
function huleResult(rec, k) {
var out = ['和了'];
var loser = k.lastActorSeat;
var hules = rec.hules.slice();
var first = hules.slice().sort(function (a, b) {
return relative(a.seat, loser) - relative(b.seat, loser);
})[0];
hules.forEach(function (h) {
var delta = [0, 0, 0, 0];
if (hules.length === 1 && rec.delta_scores.length === 4) {
delta = rec.delta_scores.slice();
} else {
var isFirst = h === first;
var honba = isFirst ? k.honba : 0;
var sticks = isFirst ? (k.kyotaku + k.riichiThisRound) * 1000 : 0;
if (h.zimo) {
for (var s = 0; s < 4; s++) {
if (s === h.seat) continue;
var pay = (s === k.dealer ? h.point_zimo_qin : h.point_zimo_xian) + honba * 100;
if (h.qinjia) pay = h.point_zimo_xian + honba * 100;
delta[s] -= pay;
delta[h.seat] += pay;
}
} else {
delta[loser] -= h.point_rong + honba * 300;
delta[h.seat] += h.point_rong + honba * 300;
}
delta[h.seat] += sticks;
k.warnings.push('複数の和了: 点数の移動を計算で求めた');
}
var who = [h.seat, h.zimo ? h.seat : loser, h.seat, scoreLabel(h)].concat(yakuLabels(h));
out.push(delta, who);
});
return out;
}
var LIUJU_NAMES = { 1: '九種九牌', 2: '四風連打', 3: '四槓散了', 4: '四家立直', 5: '三家和了' };
function newKyoku(rec, warnings) {
var k = {
round: [rec.chang * 4 + rec.ju, rec.ben, rec.liqibang],
honba: rec.ben,
kyotaku: rec.liqibang,
dealer: rec.ju,
scores: rec.scores.slice(0, 4),
doras: (rec.doras.length ? rec.doras : (rec.dora ? [rec.dora] : [])).map(tileCode),
haipai: [], draws: [[], [], [], []], discards: [[], [], [], []], hands: [],
lastDrawn: [null, null, null, null], // 直前にツモった牌（ツモ切り判定用）
lastActorSeat: rec.ju,               // 直前に打牌・加槓した人（ロンの放銃者）
riichiThisRound: 0,
paishan: rec.paishan || null,
md5: rec.md5 || null,
warnings: warnings
};
for (var s = 0; s < 4; s++) {
var tiles = rec['tiles' + s].map(tileCode);
if (s === rec.ju) {
var first = tiles.pop();
k.draws[s].push(first);
k.lastDrawn[s] = first;
k.hands.push(tiles.concat([first]));
} else {
k.hands.push(tiles.slice());
}
k.haipai.push(tiles);
}
while (k.scores.length < 4) k.scores.push(0);
return k;
}
function updateDoras(k, doras) {
if (doras && doras.length > k.doras.length) k.doras = doras.map(tileCode);
}
function countRiichi(k, liqi) {
if (liqi && !liqi.failed) k.riichiThisRound++;
}
function dump(k, uras, result) {
var entry = [k.round, k.scores, k.doras, uras];
for (var s = 0; s < 4; s++) entry.push(k.haipai[s], k.draws[s], k.discards[s]);
entry.push(result);
return entry;
}
function convert(game) {
var head = game.head;
var warnings = game.warnings ? game.warnings.slice() : [];
var log = [], paishan = [], md5 = [], k = null;
game.records.forEach(function (rec, idx) {
var where = '#' + idx + ' ' + rec._type;
switch (rec._type) {
case 'RecordNewRound':
k = newKyoku(rec, warnings);
return;
case 'RecordDealTile': {
countRiichi(k, rec.liqi);
updateDoras(k, rec.doras);
var t = tileCode(rec.tile);
k.draws[rec.seat].push(t);
k.hands[rec.seat].push(t);
k.lastDrawn[rec.seat] = t;
return;
}
case 'RecordDiscardTile': {
var tile = tileCode(rec.tile);
var sym = (rec.moqie && k.lastDrawn[rec.seat] === tile) ? TSUMOGIRI : tile;
if (rec.is_liqi || rec.is_wliqi) sym = 'r' + sym;
k.discards[rec.seat].push(sym);
removeTile(k.hands[rec.seat], tile, warnings, where);
k.lastDrawn[rec.seat] = null;
k.lastActorSeat = rec.seat;
updateDoras(k, rec.doras);
return;
}
case 'RecordChiPengGang': {
countRiichi(k, rec.liqi);
var seat = rec.seat;
var codes = rec.tiles.map(tileCode);
var calledIdx = rec.froms.findIndex(function (f) { return f !== seat; });
if (calledIdx < 0) { warnings.push(where + ': 鳴いた牌が特定できない'); calledIdx = codes.length - 1; }
var called = codes[calledIdx];
var from = rec.froms[calledIdx];
var own = codes.filter(function (_, i) { return i !== calledIdx; });
own.forEach(function (c) { removeTile(k.hands[seat], c, warnings, where); });
var str;
if (rec.type === 0) {
str = 'c' + called + own.join('');
} else {
var rel = relative(seat, from); // 1:上家 2:対面 3:下家
var pos = rec.type === 1 ? rel - 1 : (rel === 3 ? 3 : rel - 1);
var parts = own.map(String);
parts.splice(pos, 0, (rec.type === 1 ? 'p' : 'm') + called);
str = parts.join('');
}
k.draws[seat].push(str);
k.lastDrawn[seat] = null;
if (rec.type === 2) k.discards[seat].push(0); // 大明槓は打牌の欄に 0 を置く
return;
}
case 'RecordAnGangAddGang': {
var s2 = rec.seat;
var t2 = tileCode(rec.tiles);
k.lastActorSeat = s2; // 槍槓の放銃者
if (rec.type === 3) {
var four = k.hands[s2].filter(function (c) { return plain(c) === plain(t2); });
if (four.length !== 4) warnings.push(where + ': 暗槓の牌が4枚そろっていない（' + four.length + '枚）');
four.sort(function (a, b) { return a - b; }); // 赤5（5x）を最後に
four.forEach(function (c) { removeTile(k.hands[s2], c, warnings, where); });
var last = four.pop();
k.discards[s2].push(four.join('') + 'a' + last);
} else if (rec.type === 2) {
var pon = k.draws[s2].filter(function (d) {
if (typeof d !== 'string') return false;
var i = d.indexOf('p');
return i >= 0 && plain(parseInt(d.substr(i + 1, 2), 10)) === plain(t2);
})[0];
if (!pon) { warnings.push(where + ': 加槓の元になるポンがない'); pon = 'p' + t2 + t2 + t2; }
k.discards[s2].push(pon.replace('p', 'k' + t2));
removeTile(k.hands[s2], t2, warnings, where);
} else {
warnings.push(where + ': 未対応の槓の種類 ' + rec.type);
}
k.lastDrawn[s2] = null;
updateDoras(k, rec.doras);
return;
}
case 'RecordBaBei':
warnings.push(where + ': 三人麻雀の抜きドラは対象外');
return;
case 'RecordHule': {
var uras = [];
rec.hules.forEach(function (h) { if (h.li_doras.length > uras.length) uras = h.li_doras.map(tileCode); });
updateDoras(k, rec.doras);
log.push(dump(k, uras, huleResult(rec, k)));
paishan.push(k.paishan); md5.push(k.md5);
return;
}
case 'RecordNoTile': {
var delta = [0, 0, 0, 0];
rec.scores.forEach(function (sc) { sc.delta_scores.forEach(function (d, i) { delta[i] += d; }); });
var tenpai = rec.players.map(function (p) { return p.tingpai; });
var name = rec.liujumanguan ? '流し満貫'
: tenpai.length === 4 && tenpai.every(Boolean) ? '全員聴牌'
: tenpai.length === 4 && !tenpai.some(Boolean) ? '全員不聴' : '流局';
log.push(dump(k, [], [name, delta]));
paishan.push(k.paishan); md5.push(k.md5);
return;
}
case 'RecordLiuJu': {
countRiichi(k, rec.liqi);
var nm = LIUJU_NAMES[rec.type];
if (!nm) { warnings.push(where + ': 未知の途中流局 type=' + rec.type); nm = '流局'; }
log.push(dump(k, [], [nm]));
paishan.push(k.paishan); md5.push(k.md5);
return;
}
default:
warnings.push(where + ': 変換しないレコード');
}
});
var players = (head.accounts || []).concat(head.robots || []);
var names = ['', '', '', ''], rate = [0, 0, 0, 0];
players.forEach(function (a) {
names[a.seat] = a.nickname || 'AI';
rate[a.seat] = a.level ? a.level.score : 0;
});
var sc = [0, 0, 0, 0, 0, 0, 0, 0];
((head.result && head.result.players) || []).forEach(function (p) {
sc[2 * p.seat] = p.part_point_1;
sc[2 * p.seat + 1] = p.total_point / 1000;
});
var mode = head.config && head.config.mode ? head.config.mode.mode : 0;
var meta = (head.config && head.config.meta) || {};
var length = (mode === 1 || mode === 11) ? '東' : (mode === 2 || mode === 12) ? '南' : '';
var room = meta.mode_id ? '段位戦' : meta.room_id ? '友人戦' : meta.contest_uid ? '大会戦' : '';
var disp = '雀魂' + room + length + '喰赤';
return {
title: [disp, new Date(head.end_time * 1000).toISOString()],
name: names,
rule: { disp: disp, aka53: 1, aka52: 1, aka51: 1 },
ratingc: 'PF4',
lobby: 0,
dan: ['', '', '', ''],
rate: rate,
sx: ['C', 'C', 'C', 'C'],
sc: sc,
ref: head.uuid,
log: log,
mlk: {
version: MLK_EXT_VERSION,
source: 'majsoul',
record_version: game.version,
game_mode: mode,
mode_id: meta.mode_id || 0,
start_time: head.start_time,
end_time: head.end_time,
paishan: paishan,
md5: md5,
warnings: warnings
}
};
}
function withoutExtension(t) {
var copy = {};
Object.keys(t).forEach(function (key) { if (key !== 'mlk') copy[key] = t[key]; });
return copy;
}
return { convert: convert, withoutExtension: withoutExtension, tileCode: tileCode, plain: plain };
})();
var MLK_CAPTURE = (function () {
'use strict';
var STATE_KEY = '__mlkCapture';
if (window[STATE_KEY]) return window[STATE_KEY]; // 2回目の実行では、既存の観察をそのまま使う
var FETCH_METHOD = '.lq.Lobby.fetchGameRecord';
var state = {
installedAt: new Date().toISOString(),
sockets: 0,
framesSent: 0,
framesReceived: 0,
recentMethods: [],   // 直近に観察した要求のメソッド名（診断用）
records: [],         // [{uuid, capturedAt, bytes(Uint8Array: ResGameRecord)}]
errors: [],
listeners: []
};
function toU8(data) {
if (data instanceof ArrayBuffer) return new Uint8Array(data);
if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
return null; // 文字列や Blob は牌譜に関係しないので見ない
}
function note(list, item, max) {
list.push(item);
if (list.length > max) list.shift();
}
function onSend(ws, data) {
var u8 = toU8(data);
if (!u8) return;
state.framesSent++;
var frame = MLK_PB.parseFrame(u8);
if (!frame || frame.kind !== MLK_PB.FRAME.REQUEST) return;
var w = MLK_PB.decode('Wrapper', frame.body);
note(state.recentMethods, w.name, 20);
if (w.name !== FETCH_METHOD) return;
var req = MLK_PB.decode('ReqGameRecord', w.data);
ws.__mlkPending = ws.__mlkPending || {};
ws.__mlkPending[frame.index] = req.game_uuid;
}
function onReceive(ws, data) {
var u8 = toU8(data);
if (!u8) return;
state.framesReceived++;
var frame = MLK_PB.parseFrame(u8);
if (!frame || frame.kind !== MLK_PB.FRAME.RESPONSE) return;
var pending = ws.__mlkPending;
if (!pending || !(frame.index in pending)) return;
var uuid = pending[frame.index];
delete pending[frame.index];
var w = MLK_PB.decode('Wrapper', frame.body);
var entry = { uuid: uuid, capturedAt: new Date().toISOString(), bytes: new Uint8Array(w.data) };
state.records.push(entry);
state.listeners.forEach(function (fn) { try { fn(entry); } catch (e) { /* 表示側の失敗は無視 */ } });
}
function guard(fn) {
return function () {
try { fn.apply(null, arguments); } catch (e) { note(state.errors, String(e && e.message || e), 20); }
};
}
var originalSend = WebSocket.prototype.send;
var safeSend = guard(onSend), safeReceive = guard(onReceive);
WebSocket.prototype.send = function (data) {
var ws = this;
if (!ws.__mlkHooked) {
ws.__mlkHooked = true;
state.sockets++;
ws.addEventListener('message', function (ev) { safeReceive(ws, ev.data); });
}
safeSend(ws, data);
return originalSend.apply(this, arguments);
};
state.onRecord = function (fn) { state.listeners.push(fn); };
state.latest = function () { return state.records[state.records.length - 1] || null; };
window[STATE_KEY] = state;
return state;
})();
var MLK_UI = (function () {
'use strict';
var PANEL_ID = 'mlk-panel';
var BUILD = '2026.10.07.2316'; // build.py が埋め込む版情報
var current = null; // {entry, game, tenhou, error}
function el(tag, attrs, children) {
var e = document.createElement(tag);
Object.keys(attrs || {}).forEach(function (k) {
if (k === 'style') e.style.cssText = attrs[k];
else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
else e.setAttribute(k, attrs[k]);
});
(children || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
return e;
}
var BTN = 'display:block;width:100%;margin:4px 0;padding:8px;font-size:14px;border:0;border-radius:6px;' +
'background:#2d6cdf;color:#fff;cursor:pointer;text-align:left';
function button(label, fn) {
return el('button', { style: BTN, onclick: function (ev) { ev.stopPropagation(); fn(); } }, [label]);
}
function toast(msg) {
var box = document.getElementById(PANEL_ID + '-msg');
if (box) box.textContent = msg;
}
function base64(u8) {
var s = '';
for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
return btoa(s);
}
function copyText(text, label) {
function fallback() {
var ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0' });
ta.value = text;
document.body.appendChild(ta);
ta.select();
var ok = false;
try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
ta.remove();
toast(ok ? label + 'をコピーしました（' + text.length + '文字）' : 'コピーに失敗しました');
}
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(text).then(function () {
toast(label + 'をコピーしました（' + text.length + '文字）');
}, fallback);
} else fallback();
}
function download(filename, text) {
var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
var a = el('a', { href: url, download: filename });
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
toast(filename + ' を保存しました');
}
function fileBase() {
var t = current && current.tenhou;
var date = t ? new Date(t.mlk.end_time * 1000) : new Date();
var p = function (n) { return (n < 10 ? '0' : '') + n; };
return 'majsoul_' + date.getFullYear() + p(date.getMonth() + 1) + p(date.getDate()) + '_' +
p(date.getHours()) + p(date.getMinutes());
}
function diagnostics() {
var cap = window.__mlkCapture || {};
return JSON.stringify({
build: BUILD,
userAgent: navigator.userAgent,
url: location.href,
installedAt: cap.installedAt,
sockets: cap.sockets,
framesSent: cap.framesSent,
framesReceived: cap.framesReceived,
recentMethods: cap.recentMethods,
errors: cap.errors,
capturedRecords: (cap.records || []).map(function (r) { return { uuid: r.uuid, bytes: r.bytes.length }; }),
conversion: current && {
uuid: current.entry.uuid,
error: current.error,
recordVersion: current.game && current.game.version,
recordTypes: current.game && countTypes(current.game.records),
kyokus: current.tenhou && current.tenhou.log.length,
warnings: current.tenhou && current.tenhou.mlk.warnings
}
}, null, 2);
}
function countTypes(records) {
var c = {};
records.forEach(function (r) { c[r._type] = (c[r._type] || 0) + 1; });
return c;
}
function summary() {
if (!current) {
return '待機中：雀魂の牌譜を開いてください。' +
'（すでに開いている場合は、一度閉じて開き直してください）';
}
if (current.error) return '取得はできましたが、変換に失敗しました：' + current.error;
var t = current.tenhou;
var w = t.mlk.warnings.length;
return '取得しました：' + t.title[0] + '／' + t.log.length + '局／' + t.name.join('・') +
(w ? '（警告 ' + w + ' 件。診断情報をご確認ください）' : '');
}
function tenhouViewerUrl(obj) {
return 'https://tenhou.net/5/#json=' + encodeURIComponent(JSON.stringify(obj));
}
function render() {
var old = document.getElementById(PANEL_ID);
if (old) old.remove();
var body = [];
body.push(el('div', { style: 'font-weight:bold;margin-bottom:4px' }, ['雀魂 運解析 PoC（牌譜取り出し）']));
body.push(el('div', { style: 'margin-bottom:6px;line-height:1.4' }, [summary()]));
if (current && current.tenhou) {
var t = current.tenhou;
body.push(button('天鳳ビューアで開く（拡張フィールドなし）', function () {
window.open(tenhouViewerUrl(MLK_CONVERT.withoutExtension(t)), '_blank');
}));
body.push(button('天鳳ビューアで開く（拡張フィールドあり）', function () {
window.open(tenhouViewerUrl(t), '_blank');
}));
body.push(button('天鳳JSONをコピー', function () { copyText(JSON.stringify(t), '天鳳JSON'); }));
body.push(button('天鳳JSONを保存', function () { download(fileBase() + '.tenhou.json', JSON.stringify(t)); }));
}
if (current) {
body.push(button('生データを保存（不具合調査用）', function () {
download(fileBase() + '.raw.json', JSON.stringify({
build: BUILD, uuid: current.entry.uuid, capturedAt: current.entry.capturedAt,
resGameRecordBase64: base64(current.entry.bytes)
}));
}));
}
body.push(button('診断情報をコピー', function () { copyText(diagnostics(), '診断情報'); }));
body.push(button('パネルを閉じる', function () { document.getElementById(PANEL_ID).remove(); }));
body.push(el('div', { id: PANEL_ID + '-msg', style: 'margin-top:4px;min-height:1.2em;color:#ffd479' }, []));
var panel = el('div', {
id: PANEL_ID,
style: 'position:fixed;top:8px;right:8px;z-index:2147483647;width:280px;max-height:90vh;overflow:auto;' +
'padding:10px;background:rgba(20,20,30,.94);color:#fff;font:13px/1.4 sans-serif;border-radius:10px;' +
'box-shadow:0 4px 16px rgba(0,0,0,.5)'
}, body);
document.body.appendChild(panel);
}
function handle(entry) {
current = { entry: entry, game: null, tenhou: null, error: null };
try {
current.game = MLK_PB.decodeGameRecord(entry.bytes);
current.tenhou = MLK_CONVERT.convert(current.game);
} catch (e) {
current.error = String(e && e.message || e);
}
render();
}
function start() {
var cap = MLK_CAPTURE;
if (!cap.__mlkUiBound) {
cap.__mlkUiBound = true;
cap.onRecord(handle);
}
var latest = cap.latest();
if (latest && (!current || current.entry !== latest)) handle(latest);
else render();
}
return { start: start, render: render };
})();
MLK_UI.start();
})();
