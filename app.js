/* SRVC: vehicle service tracker. Plain JS, data in localStorage. */
(function () {
  'use strict';

  var KEY = 'srvc.v1';
  var app = document.getElementById('app');
  var db;

  // ---------- storage ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return clone(window.SRVC_SEED);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast('Could not save. Storage full?'); }
  }
  db = load();
  if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function () {}); }

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  function todayISO() { return iso(new Date()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addMonths(s, m) { var d = parse(s); var day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + m); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d); }
  function days(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function fmtDate(s) { if (!s) return '—'; var p = s.split('-'); return p[1] + '.' + p[2] + '.' + p[0].slice(2); }
  function fmtMY(s) { var p = s.split('-'); return p[1] + '.' + p[0]; }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }
  function odoFmt(n) { if (n == null) return '———,———'; var s = pad(Math.round(n), 6); return s.slice(0, s.length - 3) + ',' + s.slice(-3); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toInt(v) { v = String(v || '').replace(/[^0-9]/g, ''); return v ? parseInt(v, 10) : null; }
  function toMoney(v) { v = String(v || '').replace(/[^0-9.]/g, ''); return v ? Math.round(parseFloat(v) * 100) / 100 : null; }
  function car(id) { for (var i = 0; i < db.cars.length; i++) if (db.cars[i].id === id) return db.cars[i]; return null; }
  function itemOf(c, id) { for (var i = 0; i < c.items.length; i++) if (c.items[i].id === id) return c.items[i]; return null; }
  function fitSize(name, maxW, cap) { return Math.round(Math.min(cap, maxW / (Math.max(name.length, 2) * 0.8))); }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }

  var REG = '<svg class="reg" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="9" fill="none" stroke="#161616" stroke-width="1.5"/><path d="M17 0v34M0 17h34" stroke="#161616" stroke-width="1.5"/></svg>';
  var BARCODE = '<svg width="64" height="10" viewBox="0 0 64 10" aria-hidden="true"><path d="M1 0v10M4 0v10M5 0v10M9 0v10M12 0v10M13 0v10M14 0v10M18 0v10M21 0v10M25 0v10M26 0v10M30 0v10M33 0v10M34 0v10M38 0v10M41 0v10M45 0v10M46 0v10M47 0v10M51 0v10M54 0v10M58 0v10M59 0v10M63 0v10" stroke="#161616"/></svg>';

  // ---------- domain ----------
  function odoLatest(c) {
    if (!c.odo.length) return null;
    var best = c.odo[0];
    c.odo.forEach(function (o) { if (o.miles > best.miles) best = o; });
    return best;
  }
  function lastDate(c) {
    var d = null;
    c.odo.forEach(function (o) { if (!d || o.date > d) d = o.date; });
    return d;
  }
  function logsFor(cid) { return db.log.filter(function (l) { return l.car === cid; }); }

  // Most recent service for an item: the stored baseline or any log entry, whichever is newer.
  function effLast(c, it) {
    var best = it.last ? { date: it.last.date, miles: it.last.miles, assumed: it.last.assumed } : null;
    logsFor(c.id).forEach(function (l) {
      if (l.items.indexOf(it.id) < 0) return;
      if (!best || l.date > best.date || (l.date === best.date && (l.miles || 0) > (best.miles || 0))) {
        best = { date: l.date, miles: l.miles, assumed: false };
      }
    });
    return best;
  }

  var RANK = { ovr: 0, due: 1, unk: 2, ok: 3 };
  function status(c, it) {
    var odo = odoLatest(c), cur = odo ? odo.miles : null, today = todayISO();
    var last = effLast(c, it);
    var r = { st: 'ok', label: 'Done', pct: null, last: last };
    var fMi = null, fD = null, remMi = null, remD = null, dueDate = null;

    if (last) {
      if (it.mi && last.miles != null && cur != null) {
        remMi = last.miles + it.mi - cur;
        fMi = (cur - last.miles) / it.mi;
      }
      if (it.mo && last.date) {
        dueDate = addMonths(last.date, it.mo);
        remD = days(today, dueDate);
        var total = days(last.date, dueDate);
        fD = total > 0 ? days(last.date, today) / total : 1;
      }
    }
    var hasCalc = fMi != null || fD != null;
    var useMi = fMi != null && (fD == null || fMi >= fD || remMi < 0);

    if (!last) { r.st = 'unk'; r.label = 'No rec'; }
    else if (!hasCalc) {
      if ((it.mi || it.mo)) { r.st = 'unk'; r.label = cur == null ? 'No odo' : 'No rec'; }
      else { r.st = 'ok'; r.label = 'Done'; }
    } else {
      r.pct = Math.max(0, Math.min(100, Math.round(Math.max(fMi || 0, fD || 0) * 100)));
      if (useMi) r.label = remMi < 0 ? '−' + num(-remMi) + ' mi' : num(remMi) + ' mi';
      else r.label = remD < 0 ? num(-remD) + ' d late' : remD <= 60 ? remD + ' days' : fmtMY(dueDate);
      var soonMi = it.mi ? Math.max(1000, it.mi * 0.3) : 0;
      if ((remMi != null && remMi < 0) || (remD != null && remD < 0)) r.st = 'ovr';
      else if ((remMi != null && remMi <= soonMi) || (remD != null && remD <= 30)) r.st = 'due';
      else r.st = 'ok';
    }
    if (it.flag === 'red' && r.st !== 'ovr') { r.st = 'ovr'; r.label = 'Flagged'; }
    if (it.flag === 'yellow' && (r.st === 'ok' || r.st === 'unk')) { r.st = 'due'; r.label = 'Inspect'; }
    return r;
  }
  function intervalText(it) {
    var mo = it.mo ? (it.mo % 12 === 0 ? (it.mo / 12) + ' yr' : it.mo + ' mo') : null;
    if (it.mi && mo) return num(it.mi) + ' mi / ' + mo;
    if (it.mi) return 'Every ' + num(it.mi) + ' mi';
    if (mo) return 'Every ' + mo;
    return 'No interval';
  }
  function metaText(it, s) {
    var parts = [intervalText(it)];
    if (!s.last || s.last.assumed) parts.push('no record');
    else parts.push('last ' + fmtDate(s.last.date) + (s.last.miles != null && it.mi ? ' · ' + num(s.last.miles) : ''));
    if (it.flag) parts.push('flagged ' + it.flag);
    return parts.join(' · ');
  }
  function sorted(c) {
    return c.items.map(function (it, i) { return { it: it, s: status(c, it), i: i }; })
      .sort(function (a, b) { return RANK[a.s.st] - RANK[b.s.st] || (b.s.pct || 0) - (a.s.pct || 0) || a.i - b.i; });
  }
  function counts(list) {
    var n = { ovr: 0, due: 0, ok: 0, unk: 0 };
    list.forEach(function (x) { n[x.s.st]++; });
    return n;
  }
  function chip(s) { return '<span class="chip ' + s.st + '">' + esc(s.label) + '</span>'; }
  function p2(n) { return pad(n, 2); }

  // ---------- views ----------
  function viewDash() {
    var t = new Date();
    var h = '<header class="top"><h1 class="x brand" style="margin:0">SRVC</h1>' +
      '<div class="m s10" style="line-height:1.5;text-align:right">SYS.STATUS: <span class="inv">ONLINE</span><br>' +
      pad(t.getMonth() + 1, 2) + '.' + pad(t.getDate(), 2) + '.' + t.getFullYear() + ' // ' + db.cars.length + ' UNITS</div></header>' +
      '<div class="m s10 row mute" style="margin-top:-6px"><span>Vehicle Service Control</span><span>//////</span><span>Rec-local</span></div>';

    db.cars.forEach(function (c) {
      var odo = odoLatest(c);
      var spec = [c.make, c.year].filter(Boolean).join(' · ');
      if (!odo) {
        h += '<a class="box" href="#/car/' + c.id + '" style="display:flex">' +
          '<div style="padding:12px;flex:1;min-width:0"><div class="m s10">[ Unit ' + esc(c.unit) + ' ] ' + esc(spec) + '</div>' +
          '<div class="x" style="font-size:' + fitSize(c.name, 220, 56) + 'px;line-height:.9;margin-top:8px">' + esc(c.name) + '</div></div>' +
          '<div class="hatch" style="width:118px;border-left:2px solid #161616;padding:12px 10px;display:flex;flex-direction:column;justify-content:space-between">' +
          '<div class="m s8" style="line-height:1.5">Status:<br><b>Awaiting data</b></div>' +
          '<div class="m s8 mute" style="line-height:1.5">ODO ——,———<br>Tap to start ▸</div></div></a>';
        return;
      }
      var list = sorted(c), n = counts(list);
      var next = list.filter(function (x) { return x.s.st === 'ovr' || x.s.st === 'due'; })[0];
      var cols = [];
      if (n.ovr) cols.push([n.ovr, 'c-ovr', 'Overdue']);
      if (n.due) cols.push([n.due, 'c-due', 'Due soon']);
      if (n.ok) cols.push([n.ok, 'c-ok', 'OK']);
      if (n.unk) cols.push([n.unk, 'c-unk', 'No rec']);
      var tpl = cols.map(function (x) { return x[0] + 'fr'; }).join(' ');
      h += '<a class="card" href="#/car/' + c.id + '" aria-label="Open unit ' + esc(c.unit) + ', ' + esc(c.name) + '">' +
        '<div class="strip m"><span>[ Unit ' + esc(c.unit) + ' ]</span><span>' + esc([c.make, c.year].concat(c.engine ? [c.engine.split(' ').slice(-2).join(' ')] : []).join(' · ')) + '</span><span>▸</span></div>' +
        '<div class="row" style="padding:12px 12px 0;align-items:flex-start"><div class="x" style="font-size:' + fitSize(c.name, 250, 96) + 'px;line-height:.82">' + esc(c.name) + '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' + REG +
        '<div class="m s8" style="text-align:right;line-height:1.4">' + esc(c.trim || '') + '<br>' + esc((c.engine || '').split(' ')[0]) + '</div></div></div>' +
        '<div class="row" style="padding:14px 12px 12px;align-items:flex-end;border-bottom:1px dashed #161616"><div>' +
        '<div class="m s8 mute">Odometer</div><div class="m b" style="font-size:34px;letter-spacing:0;line-height:1">' + odoFmt(odo.miles) + '<span style="font-size:13px"> MI</span></div></div>' +
        '<div class="m s8 mute" style="text-align:right;line-height:1.5">Last entry<br>' + fmtDate(lastDate(c)) + '</div></div>' +
        '<div style="padding:12px"><div class="bar3" style="grid-template-columns:' + tpl + '">' +
        cols.map(function (x) { return '<div class="' + x[1] + '"></div>'; }).join('') + '</div>' +
        '<div class="m s10 b" style="display:grid;gap:3px;margin-top:5px;grid-template-columns:' + tpl + '">' +
        cols.map(function (x) { return '<span>' + p2(x[0]) + ' ' + x[2] + '</span>'; }).join('') + '</div>' +
        (next ? '<div class="m s11 row" style="margin-top:12px;border:1.5px solid #161616;padding:8px 10px"><span>Next ▸ <b>' + esc(next.it.name) + '</b></span>' + chip(next.s) + '</div>'
              : '<div class="m s11" style="margin-top:12px;border:1.5px solid #161616;padding:8px 10px">All items nominal</div>') +
        '</div></a>';
    });

    h += '<div class="btns" style="margin-top:auto"><a class="btn" href="#/miles">+ Mileage</a>' +
      '<a class="btn solid" href="#/log">+ Log service <span class="arr">▸▸▸</span></a></div>' +
      '<footer class="foot m"><a href="#/data">Data // stored on device ▸</a>' + BARCODE + '<span>v1.0</span></footer>';
    return h;
  }

  var filter = 'all';
  function viewCar(cid) {
    var c = car(cid); if (!c) return viewMissing();
    var odo = odoLatest(c), list = sorted(c), n = counts(list);
    var shown = list.filter(function (x) { return filter === 'all' || x.s.st === filter || (filter === 'ok' && x.s.st === 'unk'); });
    var swatch = c.paintHex ? '<div style="width:30px;height:30px;background:' + esc(c.paintHex) + ';border:1.5px solid #161616"></div>' : REG;
    var specs = [['Model', [c.make, c.model, c.year].filter(Boolean).join(' ')], ['Trim', c.trim], ['Engine', c.engine], ['Trans', c.trans], ['Oil spec', c.oil], ['VIN', c.vin ? '···' + c.vin.slice(-8) : '']];
    var lastScan = c.scans.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    var codeCount = lastScan ? lastScan.codes.split(/[\s,]+/).filter(Boolean).length : 0;

    var h = '<nav class="nav m"><a href="#/">◂ Units</a><span class="s10 mute">Unit ' + esc(c.unit) + ' / ' + p2(db.cars.length) + '</span></nav>' +
      '<section class="box"><div class="row" style="padding:12px 12px 10px;border-bottom:2px solid #161616;align-items:flex-end">' +
      '<h1 class="x" style="margin:0;font-size:' + fitSize(c.name, 260, 104) + 'px;line-height:.8">' + esc(c.name) + '</h1>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:16px;padding-bottom:6px;padding-right:4px">' + swatch +
      '<div class="m s8" style="text-align:right;line-height:1.4">' + esc(c.paintCode || '') + '<br>' + esc(c.paintName || '') + '</div></div></div>' +
      '<div class="spec m">' + specs.map(function (s) { return '<div><div class="k">' + s[0] + '</div><div class="v">' + esc(s[1] || '—') + '</div></div>'; }).join('') + '</div></section>' +

      '<section style="display:flex;align-items:stretch;border:2px solid #161616;background:#161616;color:#ECEBE6">' +
      '<div style="flex:1;padding:10px 12px"><div class="m s8" style="color:#B9B8B1">Odometer // last entry ' + fmtDate(lastDate(c)) + '</div>' +
      '<div class="m b" style="font-size:30px;letter-spacing:0;line-height:1.1">' + odoFmt(odo ? odo.miles : null) + '<span style="font-size:12px"> MI</span></div></div>' +
      '<a href="#/miles/' + c.id + '" class="m s11 b" style="width:96px;border-left:2px solid #ECEBE6;background:#EE4B1A;color:#161616;display:flex;flex-direction:column;align-items:center;justify-content:center">Update<span>▸</span></a></section>' +

      '<div class="m s10 b row" style="margin-top:4px"><span>Service items [' + p2(c.items.length) + ']</span><a href="#/item/' + c.id + '/new" style="min-height:32px;display:flex;align-items:center">+ Add item</a></div>' +
      '<div class="tabs" style="margin-top:-6px" role="group" aria-label="Filter">' +
      [['all', 'All ' + p2(c.items.length)], ['ovr', 'Ovr ' + p2(n.ovr)], ['due', 'Due ' + p2(n.due)], ['ok', 'OK ' + p2(n.ok + n.unk)]].map(function (f) {
        return '<button data-act="filter" data-v="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + f[1] + '</button>';
      }).join('') + '</div>' +

      '<div class="items">' + (shown.length ? shown.map(function (x) {
        var idx = shown.indexOf(x) + 1;
        var ruler = x.s.pct == null ? '' : '<div class="ruler ' + x.s.st + '"><i style="width:' + x.s.pct + '%"></i></div>';
        return '<a class="item" href="#/item/' + c.id + '/' + x.it.id + '"><div class="m s10 mute">' + p2(idx) + '</div>' +
          '<div style="min-width:0"><div class="nm">' + esc(x.it.name) + '</div><div class="m meta mute">' + esc(metaText(x.it, x.s)) + '</div>' + ruler + '</div>' +
          '<div class="right"><div class="m s11 b">' + (x.s.st === 'ok' && x.s.label === 'Done' && x.s.last ? fmtDate(x.s.last.date) : '&nbsp;') + '</div>' + chip(x.s) + '</div></a>';
      }).join('') : '<div class="empty m mute">Nothing in this filter.</div>') + '</div>' +

      '<div class="btns"><a class="btn" href="#/history/' + c.id + '">History [' + p2(logsFor(c.id).length) + ']</a>' +
      '<a class="btn solid" href="#/log/' + c.id + '">+ Log service <span class="arr">▸▸▸</span></a></div>' +

      '<section class="box"><div class="strip m"><span>Fault codes // OBDeleven</span><span>[ ' + p2(c.scans.length) + ' ]</span></div>' +
      '<div class="row" style="padding:12px"><div><div class="x" style="font-size:40px;line-height:.9">' + p2(codeCount) + '</div>' +
      '<div class="m s8 mute" style="margin-top:4px">Codes in last scan · ' + (lastScan ? fmtDate(lastScan.date) : 'none logged') + '</div></div>' +
      '<a class="btn sm" href="#/scan/' + c.id + '">' + (c.scans.length ? 'Scans ▸' : '+ Scan note') + '</a></div></section>' +

      '<footer class="foot m"><span>' + esc(c.shop ? 'Home shop: ' + c.shop : 'No home shop set') + '</span><a href="#/edit/' + c.id + '">Edit specs ▸</a></footer>';
    return h;
  }

  function carSeg(sel, act) {
    if (db.cars.length < 2) return '';
    return '<fieldset><legend class="lab"><span>01 // Unit</span><span class="mute">Select one</span></legend><div class="seg">' +
      db.cars.map(function (c) { return '<button type="button" data-act="' + act + '" data-v="' + c.id + '" aria-pressed="' + (c.id === sel) + '" style="min-height:52px;font-size:13px">' + esc(c.unit + ' ' + c.name) + '</button>'; }).join('') +
      '</div></fieldset>';
  }

  var logSel = {};
  function viewLog(cid) {
    var c = car(cid) || db.cars[0];
    var odo = odoLatest(c);
    var h = '<nav class="nav m"><a href="' + (car(cid) ? '#/car/' + c.id : '#/') + '">✕ Cancel</a><span class="s10 mute">Form SL-01 // New record</span></nav>' +
      '<div style="border-bottom:2px solid #161616;padding-bottom:10px;margin-top:-8px"><h1 class="x" style="margin:0;font-size:44px;line-height:.9">LOG<br>SERVICE</h1>' +
      '<div class="m s8 mute row" style="margin-top:8px"><span>Entry ' + pad(db.log.length + 1, 4) + '</span><span>//////</span><span>' + fmtDate(todayISO()) + '</span></div></div>' +
      '<form data-form="log" data-car="' + c.id + '" style="display:flex;flex-direction:column;gap:18px">' +
      carSeg(c.id, 'logcar') +
      '<fieldset><legend class="lab"><span>02 // Service</span><span class="mute">Multi-select</span></legend><div class="opts">' +
      c.items.map(function (it) { return '<button type="button" class="opt" data-act="toggle" data-v="' + it.id + '" aria-pressed="' + !!logSel[it.id] + '">' + esc(it.name) + '</button>'; }).join('') +
      '</div></fieldset>' +
      '<div class="g2"><div><label class="lab" for="f-date">03 // Date</label><input id="f-date" name="date" class="in" type="date" value="' + todayISO() + '" required></div>' +
      '<div><label class="lab" for="f-mi">04 // Odometer</label><input id="f-mi" name="miles" class="in" inputmode="numeric" placeholder="' + (odo ? odoFmt(odo.miles) : '000,000') + '"></div></div>' +
      '<div class="g2"><fieldset><legend class="lab">05 // By</legend><div class="seg">' +
      ['DIY', 'Shop'].map(function (b, i) { return '<button type="button" data-act="by" data-v="' + b + '" aria-pressed="' + (i === 0) + '">' + b + '</button>'; }).join('') +
      '</div><input type="hidden" name="by" value="DIY"></fieldset>' +
      '<div><label class="lab" for="f-cost"><span>06 // Cost</span><span class="mute">USD</span></label><input id="f-cost" name="cost" class="in" inputmode="decimal" placeholder="$0.00"></div></div>' +
      '<div><label class="lab" for="f-notes"><span>07 // Parts + notes</span><span class="mute">Optional</span></label><textarea id="f-notes" name="notes" class="in" rows="3" style="text-transform:none"></textarea></div>' +
      '<div class="note m" id="preview">' + logPreview(c) + '</div>' +
      '<button class="btn solid" type="submit" style="min-height:60px;font-size:13px">Commit entry <span class="arr">▸▸▸</span></button>' +
      '</form>';
    return h;
  }
  function logPreview(c) {
    var ids = Object.keys(logSel).filter(function (k) { return logSel[k]; });
    if (!ids.length) return '<div class="b">▸ On commit</div><div class="mute">Select at least one service, or just add notes.</div>';
    return '<div class="b">▸ On commit</div>' + ids.map(function (id) {
      var it = itemOf(c, id); if (!it) return '';
      return '<div>' + esc(it.name) + ' → OK · next ' + esc(it.mi || it.mo ? intervalText(it).replace('Every ', 'in ') : 'no interval') + '</div>';
    }).join('');
  }

  function viewMiles(cid) {
    var c = car(cid) || db.cars[0], odo = odoLatest(c);
    return '<nav class="nav m"><a href="' + (car(cid) ? '#/car/' + c.id : '#/') + '">✕ Cancel</a><span class="s10 mute">Form OD-01 // Odometer</span></nav>' +
      '<div style="border-bottom:2px solid #161616;padding-bottom:10px;margin-top:-8px"><h1 class="x" style="margin:0;font-size:44px;line-height:.9">LOG<br>MILEAGE</h1></div>' +
      '<form data-form="miles" data-car="' + c.id + '" style="display:flex;flex-direction:column;gap:18px">' +
      carSeg(c.id, 'milescar') +
      '<div><label class="lab" for="f-mi"><span>02 // Odometer reading</span><span class="mute">Last ' + (odo ? odoFmt(odo.miles) : 'none') + '</span></label>' +
      '<input id="f-mi" name="miles" class="in" inputmode="numeric" required autofocus style="height:76px;font-size:36px" placeholder="' + (odo ? odoFmt(odo.miles) : '000,000') + '"></div>' +
      '<div><label class="lab" for="f-date">03 // Date</label><input id="f-date" name="date" class="in" type="date" value="' + todayISO() + '" required></div>' +
      '<button class="btn solid" type="submit" style="min-height:60px;font-size:13px">Record <span class="arr">▸▸▸</span></button></form>' +
      (c.odo.length ? '<div class="items" style="margin-top:8px">' + c.odo.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (o) {
        return '<div class="item" style="grid-template-columns:minmax(0,1fr) auto auto"><div class="m s11">' + fmtDate(o.date) + '</div><div class="m s12 b">' + odoFmt(o.miles) + '</div>' +
          '<button class="btn sm danger" style="min-height:36px" data-act="delodo" data-car="' + c.id + '" data-v="' + o.date + '|' + o.miles + '" aria-label="Delete reading">✕</button></div>';
      }).join('') + '</div>' : '');
  }

  function viewItem(cid, iid) {
    var c = car(cid); if (!c) return viewMissing();
    var isNew = iid === 'new';
    var it = isNew ? { id: '', name: '', mi: null, mo: null, last: null, flag: null, notes: '' } : itemOf(c, iid);
    if (!it) return viewMissing();
    var s = isNew ? null : status(c, it);
    var hist = isNew ? [] : logsFor(c.id).filter(function (l) { return l.items.indexOf(it.id) >= 0; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var l = it.last || {};
    return '<nav class="nav m"><a href="#/car/' + c.id + '">◂ ' + esc(c.name) + '</a><span class="s10 mute">' + (isNew ? 'New item' : 'Item ' + p2(c.items.indexOf(it) + 1)) + '</span></nav>' +
      '<div class="row" style="border-bottom:2px solid #161616;padding-bottom:10px;align-items:flex-end"><h1 class="x" style="margin:0;font-size:30px;line-height:.95">' + esc(isNew ? 'NEW ITEM' : it.name.toUpperCase()) + '</h1>' + (s ? chip(s) : '') + '</div>' +
      (s && s.last && !s.last.assumed ? '<div class="m s10 mute">Last done ' + fmtDate(s.last.date) + (s.last.miles != null ? ' at ' + num(s.last.miles) + ' mi' : '') + '</div>' : '') +
      '<form data-form="item" data-car="' + c.id + '" data-item="' + esc(it.id) + '" style="display:flex;flex-direction:column;gap:16px">' +
      '<div><label class="lab" for="i-name">Name</label><input id="i-name" name="name" class="in" required value="' + esc(it.name) + '" style="text-transform:none"></div>' +
      '<div class="g2"><div><label class="lab" for="i-mi"><span>Every</span><span class="mute">miles</span></label><input id="i-mi" name="mi" class="in" inputmode="numeric" value="' + (it.mi || '') + '"></div>' +
      '<div><label class="lab" for="i-mo"><span>Every</span><span class="mute">months</span></label><input id="i-mo" name="mo" class="in" inputmode="numeric" value="' + (it.mo || '') + '"></div></div>' +
      '<div class="g2"><div><label class="lab" for="i-ld"><span>Baseline</span><span class="mute">date</span></label><input id="i-ld" name="ldate" class="in" type="date" value="' + (l.date || '') + '"></div>' +
      '<div><label class="lab" for="i-lm"><span>Baseline</span><span class="mute">miles</span></label><input id="i-lm" name="lmiles" class="in" inputmode="numeric" value="' + (l.miles != null ? l.miles : '') + '"></div></div>' +
      '<div class="m s8 mute" style="margin-top:-8px">Baseline = last known service before logging in SRVC. Logged services override it when newer.</div>' +
      '<div><label class="lab" for="i-flag">Inspection flag</label><select id="i-flag" name="flag" class="in m" style="font-size:14px">' +
      [['', 'None'], ['yellow', 'Yellow · inspect'], ['red', 'Red · needs work']].map(function (o) { return '<option value="' + o[0] + '"' + ((it.flag || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="lab" for="i-notes"><span>Parts + notes</span></label><textarea id="i-notes" name="notes" class="in" rows="3">' + esc(it.notes) + '</textarea></div>' +
      '<button class="btn solid" type="submit">Save item <span class="arr">▸▸▸</span></button>' +
      (isNew ? '' : '<button type="button" class="btn danger" data-act="delitem" data-car="' + c.id + '" data-v="' + it.id + '">Delete item</button>') +
      '</form>' +
      (hist.length ? '<div class="m s10 b" style="margin-top:6px">History [' + p2(hist.length) + ']</div><div class="items" style="margin-top:-6px">' + hist.map(logRow).join('') + '</div>' : '');
  }

  function logRow(l) {
    var c = car(l.car);
    var names = l.items.map(function (id) { var it = c && itemOf(c, id); return it ? it.name : id; });
    return '<div class="item" style="grid-template-columns:62px minmax(0,1fr) auto;align-items:start"><div class="m s10" style="line-height:1.5">' + fmtDate(l.date) + '<br><span class="mute">' + esc(l.by || '') + '</span></div>' +
      '<div style="min-width:0"><div class="nm" style="font-size:14px">' + esc(names.join(', ') || 'Note') + '</div>' +
      (l.notes ? '<div class="meta" style="font-size:12px;color:#55554F;margin-top:3px">' + esc(l.notes) + '</div>' : '') + '</div>' +
      '<div class="right"><div class="m s10 b">' + (l.miles != null ? num(l.miles) + ' mi' : '') + '</div><div class="m s10">' + (l.cost != null ? '$' + l.cost.toFixed(2) : '') + '</div>' +
      '<button class="m s8 mute" style="background:none;border:0;min-height:32px;padding:0" data-act="dellog" data-v="' + l.id + '">Delete</button></div></div>';
  }

  function viewHistory(cid) {
    var c = car(cid); if (!c) return viewMissing();
    var list = logsFor(c.id).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var spent = list.reduce(function (s, l) { return s + (l.cost || 0); }, 0);
    return '<nav class="nav m"><a href="#/car/' + c.id + '">◂ ' + esc(c.name) + '</a><span class="s10 mute">Service history</span></nav>' +
      '<div class="row" style="border-bottom:2px solid #161616;padding-bottom:10px;align-items:flex-end"><h1 class="x" style="margin:0;font-size:44px;line-height:.9">HISTORY</h1>' +
      '<div class="m s10" style="text-align:right;line-height:1.5">' + p2(list.length) + ' entries<br>$' + num(spent) + ' logged</div></div>' +
      (list.length ? '<div class="items">' + list.map(logRow).join('') + '</div>' : '<div class="empty m mute box">No entries yet.</div>') +
      '<a class="btn solid" href="#/log/' + c.id + '">+ Log service <span class="arr">▸▸▸</span></a>';
  }

  function viewScan(cid) {
    var c = car(cid); if (!c) return viewMissing();
    var list = c.scans.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return '<nav class="nav m"><a href="#/car/' + c.id + '">◂ ' + esc(c.name) + '</a><span class="s10 mute">Form FC-01 // Scan note</span></nav>' +
      '<div style="border-bottom:2px solid #161616;padding-bottom:10px;margin-top:-8px"><h1 class="x" style="margin:0;font-size:44px;line-height:.9">FAULT<br>CODES</h1></div>' +
      '<form data-form="scan" data-car="' + c.id + '" style="display:flex;flex-direction:column;gap:16px">' +
      '<div class="g2"><div><label class="lab" for="s-date">Date</label><input id="s-date" name="date" class="in" type="date" value="' + todayISO() + '" required></div>' +
      '<div><label class="lab" for="s-mi">Odometer</label><input id="s-mi" name="miles" class="in" inputmode="numeric"></div></div>' +
      '<div><label class="lab" for="s-codes"><span>Codes</span><span class="mute">Space or comma separated</span></label><input id="s-codes" name="codes" class="in" placeholder="P0301, 01314" autocapitalize="characters"></div>' +
      '<div><label class="lab" for="s-notes">Notes</label><textarea id="s-notes" name="notes" class="in" rows="3" placeholder="Module, freeze frame, what you cleared"></textarea></div>' +
      '<button class="btn solid" type="submit">Save scan <span class="arr">▸▸▸</span></button></form>' +
      (list.length ? '<div class="items" style="margin-top:6px">' + list.map(function (s) {
        return '<div class="item" style="grid-template-columns:62px minmax(0,1fr) auto;align-items:start"><div class="m s10">' + fmtDate(s.date) + '</div>' +
          '<div style="min-width:0"><div class="m s12 b">' + esc(s.codes || 'No codes') + '</div>' + (s.notes ? '<div style="font-size:12px;color:#55554F;margin-top:3px">' + esc(s.notes) + '</div>' : '') + '</div>' +
          '<div class="right"><div class="m s10">' + (s.miles != null ? num(s.miles) : '') + '</div><button class="m s8 mute" style="background:none;border:0;min-height:32px;padding:0" data-act="delscan" data-car="' + c.id + '" data-v="' + s.id + '">Delete</button></div></div>';
      }).join('') + '</div>' : '');
  }

  function viewEdit(cid) {
    var c = car(cid); if (!c) return viewMissing();
    var f = [['name', 'Display name'], ['unit', 'Unit no.'], ['make', 'Make'], ['model', 'Model'], ['year', 'Year'], ['trim', 'Trim'], ['engine', 'Engine'], ['trans', 'Transmission'], ['oil', 'Oil spec'], ['vin', 'VIN'], ['paintName', 'Paint name'], ['paintCode', 'Paint code'], ['inService', 'In-service date'], ['shop', 'Home shop']];
    return '<nav class="nav m"><a href="#/car/' + c.id + '">✕ Cancel</a><span class="s10 mute">Unit ' + esc(c.unit) + ' // Specs</span></nav>' +
      '<form data-form="edit" data-car="' + c.id + '" style="display:flex;flex-direction:column;gap:14px">' +
      f.map(function (x) {
        var type = x[0] === 'inService' ? 'date' : 'text';
        return '<div><label class="lab" for="e-' + x[0] + '">' + x[1] + '</label><input id="e-' + x[0] + '" name="' + x[0] + '" type="' + type + '" class="in" value="' + esc(c[x[0]] || '') + '" style="text-transform:none;font-size:15px"></div>';
      }).join('') +
      '<div><label class="lab" for="e-hex">Paint swatch</label><input id="e-hex" name="paintHex" type="color" class="in" value="' + esc(c.paintHex || '#161616') + '" style="padding:4px"></div>' +
      '<button class="btn solid" type="submit">Save specs <span class="arr">▸▸▸</span></button></form>';
  }

  function viewData() {
    var bytes = new Blob([JSON.stringify(db)]).size;
    return '<nav class="nav m"><a href="#/">◂ Units</a><span class="s10 mute">Data // Rec-local</span></nav>' +
      '<div style="border-bottom:2px solid #161616;padding-bottom:10px;margin-top:-8px"><h1 class="x" style="margin:0;font-size:44px;line-height:.9">DATA</h1></div>' +
      '<div class="note m">Everything lives on this phone only (' + num(bytes / 1024) + ' KB). Export a backup now and then, and before deleting the app from your home screen.</div>' +
      '<button class="btn solid" data-act="export">Export backup <span class="arr">▸▸▸</span></button>' +
      '<label class="btn" for="imp">Import backup</label><input id="imp" type="file" accept="application/json,.json" class="sr" data-act="import">' +
      '<button class="btn danger" data-act="reset" style="margin-top:20px">Reset to starting data</button>' +
      '<footer class="foot m"><span>SRVC v1.0</span>' + BARCODE + '<span>' + db.log.length + ' records</span></footer>';
  }

  function viewMissing() { return '<nav class="nav m"><a href="#/">◂ Units</a></nav><div class="empty m box">Not found.</div>'; }

  // ---------- router ----------
  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    var v = parts[0], a = parts[1], b = parts[2], html;
    if (v === 'car') html = viewCar(a);
    else if (v === 'log') html = viewLog(a);
    else if (v === 'miles') html = viewMiles(a);
    else if (v === 'item') html = viewItem(a, b);
    else if (v === 'history') html = viewHistory(a);
    else if (v === 'scan') html = viewScan(a);
    else if (v === 'edit') html = viewEdit(a);
    else if (v === 'data') html = viewData();
    else html = viewDash();
    app.innerHTML = html;
  }
  var prevView = null;
  window.addEventListener('hashchange', function () {
    var v = location.hash.split('/')[1] || '';
    if (v === 'log' && prevView !== 'log') logSel = {};
    if (v !== 'car') filter = 'all';
    prevView = v;
    route(); window.scrollTo(0, 0);
  });

  // ---------- actions ----------
  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.tagName === 'INPUT') return;
    var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
    if (act === 'filter') { filter = v; route(); }
    else if (act === 'toggle') {
      logSel[v] = !logSel[v]; el.setAttribute('aria-pressed', !!logSel[v]);
      var f = el.closest('form'); document.getElementById('preview').innerHTML = logPreview(car(f.getAttribute('data-car')));
    }
    else if (act === 'by') {
      el.parentNode.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === el); });
      el.closest('fieldset').querySelector('input[name=by]').value = v;
    }
    else if (act === 'logcar') { logSel = {}; location.replace('#/log/' + v); }
    else if (act === 'milescar') { location.replace('#/miles/' + v); }
    else if (act === 'dellog') {
      if (!confirm('Delete this entry?')) return;
      db.log = db.log.filter(function (l) { return l.id !== v; }); save(); route(); toast('Entry deleted');
    }
    else if (act === 'delscan') {
      var c = car(el.getAttribute('data-car'));
      c.scans = c.scans.filter(function (s) { return s.id !== v; }); save(); route();
    }
    else if (act === 'delodo') {
      var c2 = car(el.getAttribute('data-car')), p = v.split('|');
      c2.odo = c2.odo.filter(function (o) { return !(o.date === p[0] && String(o.miles) === p[1]); }); save(); route();
    }
    else if (act === 'delitem') {
      var c3 = car(el.getAttribute('data-car'));
      if (!confirm('Delete this item? Its log entries stay.')) return;
      c3.items = c3.items.filter(function (i) { return i.id !== v; }); save(); location.hash = '#/car/' + c3.id;
    }
    else if (act === 'export') exportData();
    else if (act === 'reset') {
      if (!confirm('Erase everything on this phone and restore the starting data?')) return;
      db = clone(window.SRVC_SEED); save(); toast('Reset done'); location.hash = '#/';
    }
  });

  app.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-act') !== 'import') return;
    var file = e.target.files[0]; if (!file) return;
    file.text().then(function (txt) {
      var d = JSON.parse(txt);
      if (!d || !Array.isArray(d.cars) || !Array.isArray(d.log)) throw new Error('bad');
      if (!confirm('Replace everything on this phone with this backup?')) return;
      db = d; save(); toast('Backup imported'); location.hash = '#/';
    }).catch(function () { toast('Not a SRVC backup file'); });
  });

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, kind = f.getAttribute('data-form'), c = car(f.getAttribute('data-car'));
    var fd = {}; new FormData(f).forEach(function (v, k) { fd[k] = v; });

    if (kind === 'log') {
      var ids = Object.keys(logSel).filter(function (k) { return logSel[k]; });
      if (!ids.length && !fd.notes.trim()) { toast('Pick a service or add a note'); return; }
      var miles = toInt(fd.miles);
      db.log.push({ id: uid(), car: c.id, date: fd.date, miles: miles, items: ids, by: fd.by, cost: toMoney(fd.cost), notes: fd.notes.trim() });
      ids.forEach(function (id) { var it = itemOf(c, id); if (it) it.flag = null; });
      if (miles != null) c.odo.push({ date: fd.date, miles: miles });
      logSel = {}; save(); toast('Entry committed'); location.hash = '#/car/' + c.id;
    }
    else if (kind === 'miles') {
      var m = toInt(fd.miles); if (m == null) return;
      var cur = odoLatest(c);
      if (cur && m < cur.miles && !confirm('That is lower than ' + num(cur.miles) + '. Save anyway?')) return;
      c.odo.push({ date: fd.date, miles: m }); save(); toast('Odometer ' + odoFmt(m)); location.hash = '#/car/' + c.id;
    }
    else if (kind === 'item') {
      var iid = f.getAttribute('data-item'), it = iid ? itemOf(c, iid) : null;
      if (!it) { it = { id: uid() }; c.items.push(it); }
      it.name = fd.name.trim(); it.mi = toInt(fd.mi); it.mo = toInt(fd.mo);
      var lm = toInt(fd.lmiles);
      if (fd.ldate) {
        var keepAssumed = it.last && it.last.assumed && it.last.date === fd.ldate && it.last.miles === lm;
        it.last = { date: fd.ldate, miles: lm, assumed: !!keepAssumed };
      } else it.last = null;
      it.flag = fd.flag || null; it.notes = fd.notes.trim();
      save(); toast('Saved'); location.hash = '#/car/' + c.id;
    }
    else if (kind === 'scan') {
      c.scans.push({ id: uid(), date: fd.date, miles: toInt(fd.miles), codes: fd.codes.trim().toUpperCase(), notes: fd.notes.trim() });
      save(); toast('Scan saved'); route();
    }
    else if (kind === 'edit') {
      Object.keys(fd).forEach(function (k) { c[k] = k === 'year' ? (toInt(fd[k]) || '') : fd[k].trim(); });
      save(); toast('Saved'); location.hash = '#/car/' + c.id;
    }
  });

  function exportData() {
    var name = 'srvc-backup-' + todayISO() + '.json';
    var blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    var file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'SRVC backup' }).catch(function () {});
      return;
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  route();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  // Exposed for tests.
  window.__srvc = { status: status, sorted: sorted, db: function () { return db; } };
})();
