/* Pocket Ledger - preserved + upgraded. Old data migrated, never deleted. */
var CATEGORIES = [
  {id:'food', label:'Food', icon:'🍽️', color:'#E8792B', subs:['Food','Snacks','Outside']},
  {id:'groceries', label:'Groceries', icon:'🛒', color:'#2E9E5B', subs:['General Grocery','Veg & Fruits']},
  {id:'transport', label:'Transport', icon:'🚌', color:'#7A5AF8', subs:['Fuel','Rapido','Bus','Metro']},
  {id:'bills', label:'Bills', icon:'💡', color:'#3B82F6', subs:['Credit & EMI','General Bills','Mobile']},
  {id:'household', label:'Household', icon:'🏠', color:'#B7791F', subs:[]},
  {id:'wants', label:'Wants', icon:'🛍️', color:'#0E9AA7', subs:['Shoes','Clothes','Beauty & Grooming']},
  {id:'entertainment', label:'Entertainment', icon:'🎬', color:'#D9418C', subs:['Movies','Trips','Streaming Services']},
  {id:'others', label:'Others', icon:'📦', color:'#6B7280', subs:[]}
];
var KEY = 'pocket-ledger-v2';
var OLD_KEY = 'pocket-ledger-v1';
function $(id){ return document.getElementById(id); }
function inr(n){ return '₹' + Number(n || 0).toLocaleString('en-IN', {maximumFractionDigits:2}); }
function catOf(id){ for (var i=0;i<CATEGORIES.length;i++) if (CATEGORIES[i].id===id) return CATEGORIES[i]; return CATEGORIES[7]; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }
function uid(){ return Date.now()*1000 + Math.floor(Math.random()*1000); }
function todayStr(){ try { return new Date().toISOString().slice(0,10); } catch(e){ return ''; } }
var CAT_MAP = {food:'food', grocery:'groceries', fuel:'transport', entertainment:'entertainment', wants:'wants', household:'household', bills:'bills', other:'others'};
function blankState(){ return {start:0, incomes:[], expenses:[], notes:[], budgets:{}, theme:'light', notify:{enabled:true, daily:true, time:'21:00', budget:true, balance:true, lowBalance:500, recurring:true, fired:{}}}; }
function normalize(s){
  if(!s || typeof s!=='object') return blankState();
  var n = blankState();
  n.start = Math.max(0, Number(s.start) || 0);
  n.theme = (s.theme === 'dark') ? 'dark' : 'light';
  var valid = {}; CATEGORIES.forEach(function(c){ valid[c.id]=1; });
  (Array.isArray(s.incomes)?s.incomes:[]).forEach(function(x,i){
    var amt = Number(x.amount); if(!(amt>0)) return;
    n.incomes.push({id: Number(x.id)||(uid()+i), amount:amt, source:String(x.source||'').slice(0,40), note:String(x.note||'').slice(0,60), date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')?x.date:todayStr(), recurring:!!x.recurring});
  });
  (Array.isArray(s.expenses)?s.expenses:[]).forEach(function(x,i){
    var amt = Number(x.amount); if(!(amt>0)) return;
    var cid = valid[x.cat] ? x.cat : (CAT_MAP[x.cat] || 'others');
    var sub = String(x.sub||'');
    var allowed = catOf(cid).subs || [];
    if(allowed.indexOf(sub) < 0) sub = '';
    n.expenses.push({id:Number(x.id)||(uid()+i+999), cat:cid, sub:sub, amount:amt, note:String(x.note||'').slice(0,60), date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')?x.date:todayStr(), recurring:!!x.recurring});
  });
  (Array.isArray(s.notes)?s.notes:[]).forEach(function(x,i){
    if(!x || (!x.title && !x.content)) return;
    n.notes.push({id:Number(x.id)||(uid()+i+555), title:String(x.title||'').slice(0,60), content:String(x.content||'').slice(0,1000), date:/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')?x.date:todayStr()});
  });
  if(s.budgets && typeof s.budgets==='object'){
    Object.keys(s.budgets).forEach(function(k){ if(valid[k] && Number(s.budgets[k])>0) n.budgets[k]=Number(s.budgets[k]); });
  }
  if(s.notify && typeof s.notify==='object'){
    var dn = n.notify;
    dn.enabled = s.notify.enabled !== false;
    dn.daily = s.notify.daily !== false;
    dn.budget = s.notify.budget !== false;
    dn.balance = s.notify.balance !== false;
    dn.recurring = s.notify.recurring !== false;
    if(typeof s.notify.time==='string' && /^\d{2}:\d{2}$/.test(s.notify.time)) dn.time = s.notify.time;
    if(Number(s.notify.lowBalance) >= 0) dn.lowBalance = Number(s.notify.lowBalance);
    if(s.notify.fired && typeof s.notify.fired==='object') dn.fired = s.notify.fired;
  }
  if(Array.isArray(s.recurring)){}
  return n;
}
function migrateOldV1(o){
  var n = blankState();
  n.start = Math.max(0, Number(o.start)||0);
  var sal = Number(o.salary)||0, times = Math.max(1, Math.round(Number(o.salariesReceived)||1));
  if(sal > 0) n.incomes.push({id:uid(), amount:sal*times, source:'Migrated salary', note:'From old version', date:todayStr(), recurring:false});
  (o.expenses||[]).forEach(function(x,i){
    var amt = Number(x.amount); if(!(amt>0)) return;
    var cid = CAT_MAP[x.cat] || 'others';
    n.expenses.push({id:Number(x.id)||(uid()+i), cat:cid, sub:'', amount:amt, note:String(x.note||'').slice(0,60), date:x.date||todayStr(), recurring:false});
  });
  return n;
}
function loadState(){
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){ var s = normalize(JSON.parse(raw)); if(s) return s; }
    var old = localStorage.getItem(OLD_KEY);
    if(old){ var m = migrateOldV1(JSON.parse(old)); localStorage.setItem(KEY, JSON.stringify(m)); return m; }
  }catch(e){}
  return null;
}
var state = loadState();
var editingNoteId = null;
/* Collapsible UI state — keeps home short */
var showAllTx = false, showAllNotes = false, showAllRec = false, showAllBudgets = false;
var TX_LIMIT = 5, NOTES_LIMIT = 3, REC_LIMIT = 3, BUDGET_LIMIT = 3;
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){ toast('Storage full or blocked - export a CSV backup'); } }
function toast(msg){ var t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(function(){ t.classList.remove('show'); }, 2200); }
function applyTheme(){ document.body.classList.toggle('dark', state && state.theme==='dark'); var b=$('themeBtn'); if(b) b.textContent = (state && state.theme==='dark') ? '☀️ Light' : '🌙 Dark'; try{ document.querySelector('meta[name=theme-color]').setAttribute('content', state&&state.theme==='dark' ? '#11141C' : '#2F3FD0'); }catch(e){} }
function showSetup(editing){
  $('setup').classList.remove('hidden'); $('app').classList.add('hidden');
  $('startInput').value = (editing && state) ? state.start : ((state) ? state.start : '');
}
function fmtDate(d){ try{ return new Date(d+'T00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }catch(e){ return d; } }
function monthKey(d){ return String(d||'').slice(0,7); }
/* Setup + picker + forms part A */
$('startBtn').onclick = function(){
  var start = parseFloat($('startInput').value);
  if(isNaN(start) || start < 0){ $('setupErr').textContent = 'Enter a starting balance of 0 or more.'; return; }
  $('setupErr').textContent = '';
  if(state){ state.start = start; } else { state = blankState(); state.start = start; }
  save(); render();
};
$('editBtn').onclick = function(){ showSetup(true); };
$('themeBtn').onclick = function(){ state.theme = (state.theme==='dark') ? 'light' : 'dark'; save(); applyTheme(); };
function selectedCat(){ var r = document.querySelector('input[name=cat]:checked'); return r ? r.value : CATEGORIES[0].id; }
function refreshSubs(){
  var c = catOf(selectedCat());
  var wrap = $('subWrap'), sel = $('subSelect');
  if(c.subs && c.subs.length){ wrap.classList.remove('hidden'); sel.innerHTML = '<option value="">No subcategory</option>' + c.subs.map(function(s){ return '<option value="'+esc(s)+'">'+esc(s)+'</option>'; }).join(''); }
  else { wrap.classList.add('hidden'); sel.innerHTML = '<option value="">No subcategory</option>'; }
}
function buildCatPicker(){
  $('catPicker').innerHTML = CATEGORIES.map(function(c,i){
    return '<label class="cat" style="--c:'+c.color+'"><input type="radio" name="cat" value="'+c.id+'"'+(i===0?' checked':'')+'><span><em>'+c.icon+'</em>'+c.label+'</span></label>';
  }).join('');
  var radios = document.querySelectorAll('input[name=cat]');
  for(var i=0;i<radios.length;i++){ radios[i].addEventListener('change', refreshSubs); }
  refreshSubs();
}
/* Forms part B: expense + income + delete */
$('expForm').addEventListener('submit', function(e){
  e.preventDefault();
  var amount = parseFloat($('amount').value);
  var dateVal = $('date').value;
  var sub = $('subSelect').value || '';
  var c = catOf(selectedCat());
  if(c.subs.indexOf(sub) < 0) sub = '';
  if(isNaN(amount) || amount <= 0){ $('formErr').textContent = 'Enter an amount above 0.'; return; }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)){ $('formErr').textContent = 'Pick a valid date.'; return; }
  $('formErr').textContent = '';
  state.expenses.unshift({id:uid(), cat:c.id, sub:sub, amount:amount, note:$('note').value.trim(), date:dateVal, recurring:$('expRecurring').checked});
  state.expenses.sort(function(a,b){ return b.date.localeCompare(a.date) || b.id - a.id; });
  save(); $('amount').value=''; $('note').value=''; $('expRecurring').checked=false; render(); toast('Expense added'); checkAlerts('expense', c.id);
});
$('incForm').addEventListener('submit', function(e){
  e.preventDefault();
  var amount = parseFloat($('incAmount').value);
  var dateVal = $('incDate').value;
  if(isNaN(amount) || amount <= 0){ $('incErr').textContent = 'Enter an amount above 0.'; return; }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)){ $('incErr').textContent = 'Pick a valid date.'; return; }
  $('incErr').textContent = '';
  state.incomes.unshift({id:uid(), amount:amount, source:$('incSource').value.trim()||'Income', note:$('incNote').value.trim(), date:dateVal, recurring:$('incRecurring').checked});
  state.incomes.sort(function(a,b){ return b.date.localeCompare(a.date) || b.id - a.id; });
  save(); $('incAmount').value=''; $('incSource').value=''; $('incNote').value=''; $('incRecurring').checked=false; render(); toast('Income added'); checkAlerts('income');
});
function removeExpense(id){ state.expenses = state.expenses.filter(function(x){ return x.id!==id; }); save(); render(); toast('Expense deleted'); }
function removeIncome(id){ state.incomes = state.incomes.filter(function(x){ return x.id!==id; }); save(); render(); toast('Income deleted'); }
window.removeExpense = removeExpense; window.removeIncome = removeIncome;
/* CSV export/import, keeps old backups readable */
var csvCell = function(v){ v=String(v==null?'':v); return /[",\n\r]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
function exportCSV(){
  var rows = [['type','date','category','subcategory','amount','title','note']];
  rows.push(['SETUP','','starting_balance','',state.start,'','']);
  state.incomes.forEach(function(x){ rows.push(['INCOME', x.date, x.source, x.recurring?'recurring':'', x.amount, '', x.note]); });
  state.expenses.forEach(function(x){ rows.push(['EXPENSE', x.date, x.cat, x.sub||'', x.amount, '', (x.recurring?'[monthly] ':'')+x.note]); });
  state.notes.forEach(function(x){ rows.push(['NOTE', x.date, '', '', '', x.title, x.content]); });
  Object.keys(state.budgets).forEach(function(k){ rows.push(['BUDGET','',k,'',state.budgets[k],'','']); });
  var csv = rows.map(function(r){ while(r.length<7) r.push(''); return r.map(csvCell).join(','); }).join('\r\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'pocket-ledger-' + todayStr() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Backup downloaded');
}
function parseCSV(text){
  var rows=[], row=[], cell='', q=false;
  text = String(text||'').replace(/^\ufeff/, '');
  var pushCell = function(){ row.push(cell); cell=''; };
  var pushRow = function(){ row.push(cell); cell=''; rows.push(row); row=[]; };
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; } else cell+=ch; }
    else if(ch==='"') q=true;
    else if(ch===','){ pushCell(); }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; pushRow(); }
    else cell+=ch;
  }
  pushCell(); rows.push(row);
  return rows;
}
function importCSV(file){
  var reader = new FileReader();
  reader.onload = function(){
    try{
      var rows = parseCSV(reader.result);
      if(!rows.length || rows[0][0].trim().toLowerCase()!=='type') throw new Error('bad header');
      var header = rows[0].map(function(h){ return String(h||'').trim().toLowerCase(); });
      var isLegacy = header.length <= 5 || (header[3] === 'amount' && header[4] === 'note');
      var next = blankState();
      var valid = {}; CATEGORIES.forEach(function(c){ valid[c.id]=1; });
      var gotSetup = false;
      var legacySalary = 0, legacyTimes = 1;
      rows.slice(1).forEach(function(r, i){
        if(!r || !r.some(function(v){ return String(v||'').trim() !== ''; })) return;
        var type=String(r[0]||'').trim().toUpperCase();
        if(type !== 'SETUP' && type !== 'INCOME' && type !== 'EXPENSE' && type !== 'NOTE' && type !== 'BUDGET') return;
        if(isLegacy || r.length <= 5){
          var lDate = String(r[1]||'').trim();
          var lCat = String(r[2]||'').trim();
          var lAmt = parseFloat(r[3]);
          var lNote = String(r[4]||'');
          if(type==='SETUP'){
            if(isNaN(lAmt)) throw new Error('bad setup');
            if(lCat==='starting_balance'){ next.start=lAmt; gotSetup=true; }
            else if(lCat==='monthly_salary'){ legacySalary=lAmt; gotSetup=true; }
            else if(lCat==='salaries_received'){ legacyTimes=Math.max(1, Math.round(lAmt)||1); gotSetup=true; }
            else { gotSetup=true; }
          } else if(type==='EXPENSE'){
            if(isNaN(lAmt)||lAmt<=0||!/^\d{4}-\d{2}-\d{2}$/.test(lDate)) throw new Error('bad expense');
            var lCid = valid[lCat]?lCat:(CAT_MAP[lCat]||'others');
            next.expenses.push({id:uid()+i, cat:lCid, sub:'', amount:lAmt, note:lNote.slice(0,60), date:lDate, recurring:false});
          } else if(type==='INCOME'){
            if(isNaN(lAmt)||lAmt<=0||!/^\d{4}-\d{2}-\d{2}$/.test(lDate)) throw new Error('bad income');
            next.incomes.push({id:uid()+i, amount:lAmt, source:lCat||'Income', note:lNote.slice(0,60), date:lDate, recurring:false});
          }
          return;
        }
        var date=String(r[1]||'').trim();
        var c3=String(r[2]||'').trim();
        var c4=String(r[3]||'').trim();
        var note = String(r[6]!==undefined ? r[6] : (r[4]||''));
        var amt = parseFloat(r[4]);
        var title = String(r[5]||'');
        if(type==='SETUP'){
          var num=parseFloat(r[4]); if(isNaN(num)) throw new Error('bad setup');
          if(c3==='starting_balance') next.start=num;
          if(c3==='monthly_salary' && num>0) next.incomes.push({id:uid()+i, amount:num, source:'Old salary import', note:'', date:todayStr(), recurring:false});
          gotSetup = true;
        } else if(type==='INCOME'){
          if(isNaN(amt)||amt<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('bad income');
          next.incomes.push({id:uid()+i, amount:amt, source:c3||'Income', note:note.slice(0,60), date:date, recurring:(c4==='recurring')});
        } else if(type==='EXPENSE'){
          var a2=amt, d2=date, cat2=c3, note2=note, sub2=c4;
          if(r.length<=5){ a2=parseFloat(r[3]); d2=String(r[1]||'').trim(); cat2=String(r[2]||'').trim(); note2=String(r[4]||''); sub2=''; }
          if(isNaN(a2)||a2<=0||!/^\d{4}-\d{2}-\d{2}$/.test(d2)) throw new Error('bad expense');
          var cid = valid[cat2]?cat2:(CAT_MAP[cat2]||'others');
          if(catOf(cid).subs.indexOf(sub2)<0) sub2='';
          var rec = /^\[monthly\]/.test(note2);
          note2 = note2.replace(/^\[monthly\] ?/, '').slice(0,60);
          next.expenses.push({id:uid()+i, cat:cid, sub:sub2, amount:a2, note:note2, date:d2, recurring:rec});
        } else if(type==='NOTE'){
          next.notes.push({id:uid()+i+777, title:title.slice(0,60), content:note.slice(0,1000), date:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:todayStr()});
        } else if(type==='BUDGET'){
          var b=parseFloat(r[4]); if(valid[c3]&&b>0) next.budgets[c3]=b;
        }
      });
      if(legacySalary>0) next.incomes.push({id:uid()+9999, amount:legacySalary*legacyTimes, source:'Old salary import', note:'', date:todayStr(), recurring:false});
      next.incomes.sort(function(a,b){ return b.date.localeCompare(a.date)||b.id-a.id; });
      next.expenses.sort(function(a,b){ return b.date.localeCompare(a.date)||b.id-a.id; });
      if(state && !confirm('Replace your current data with this backup?')) return;
      state = normalize(next); editingNoteId=null; save(); render(); toast('Backup restored');
    }catch(e){ alert('That file could not be read. Use a CSV exported from Pocket Ledger.'); }
  };
  reader.readAsText(file);
}
var pickFile = function(){ $('csvFile').click(); };
/* Budgets + notes */
$('budgetForm').addEventListener('submit', function(e){
  e.preventDefault();
  var cat = $('budgetCat').value, amt = parseFloat($('budgetAmt').value);
  if(isNaN(amt) || amt<=0){ $('budgetErr').textContent='Enter an amount above 0.'; return; }
  $('budgetErr').textContent='';
  state.budgets[cat]=amt; save(); $('budgetAmt').value=''; render(); toast('Budget saved'); checkAlerts('budget', cat);
});
function removeBudget(cat){ delete state.budgets[cat]; save(); render(); }
window.removeBudget = removeBudget;
function renderBudgets(monthSpent){
  var box = $('budgets');
  var keys = Object.keys(state.budgets||{});
  if(!keys.length){ box.innerHTML = '<p class="empty">No budgets yet. Set one above.</p>'; var bt0=$('budgetToggle'); if(bt0) bt0.classList.add('hidden'); return; }
  var vis = showAllBudgets ? keys : keys.slice(0, BUDGET_LIMIT);
  box.innerHTML = vis.map(function(k){
    var c = catOf(k), limit = state.budgets[k], spent = monthSpent[k]||0;
    var pct = limit>0 ? Math.min(100, spent/limit*100) : 0;
    var cls = spent>limit ? 'budget over' : (spent>=limit*0.8 ? 'budget warn' : 'budget');
    var msg = spent>limit ? 'Over budget' : (spent>=limit*0.8 ? 'Near limit' : 'On track');
    return '<div class="'+cls+'"><div class="b-top"><span>'+c.icon+' '+c.label+'</span><button class="mini danger" onclick="removeBudget(\''+k+'\')">Remove</button></div><div>'+inr(spent)+' of '+inr(limit)+' ('+pct.toFixed(0)+'%) - '+msg+'</div><div class="bar" style="--c:'+c.color+'"><i style="width:'+pct+'%"></i></div></div>';
  }).join('');
  var bt = $('budgetToggle');
  if(bt){
    if(keys.length > BUDGET_LIMIT){ bt.classList.remove('hidden'); bt.textContent = showAllBudgets ? 'Show less' : 'Show all ('+keys.length+')'; }
    else bt.classList.add('hidden');
  }
}
$('noteForm').addEventListener('submit', function(e){
  e.preventDefault();
  var title = $('noteTitle').value.trim(), content = $('noteContent').value.trim();
  if(!title && !content){ $('noteErr').textContent='Write a title or some content.'; return; }
  $('noteErr').textContent='';
  if(editingNoteId){
    for(var i=0;i<state.notes.length;i++) if(state.notes[i].id===editingNoteId){ state.notes[i].title=title.slice(0,60); state.notes[i].content=content.slice(0,1000); state.notes[i].date=todayStr(); }
    editingNoteId=null; $('noteSave').textContent='Add note'; $('noteCancel').classList.add('hidden'); toast('Note updated');
  } else {
    state.notes.unshift({id:uid(), title:title.slice(0,60), content:content.slice(0,1000), date:todayStr()});
    toast('Note added');
  }
  $('noteTitle').value=''; $('noteContent').value=''; save(); render();
});
$('noteCancel').onclick = function(){ editingNoteId=null; $('noteTitle').value=''; $('noteContent').value=''; $('noteSave').textContent='Add note'; $('noteCancel').classList.add('hidden'); };
function editNote(id){ for(var i=0;i<state.notes.length;i++) if(state.notes[i].id===id){ $('noteTitle').value=state.notes[i].title; $('noteContent').value=state.notes[i].content; editingNoteId=id; $('noteSave').textContent='Save changes'; $('noteCancel').classList.remove('hidden'); } }
function removeNote(id){ state.notes = state.notes.filter(function(x){ return x.id!==id; }); if(editingNoteId===id){ editingNoteId=null; $('noteSave').textContent='Add note'; $('noteCancel').classList.add('hidden'); } save(); render(); toast('Note deleted'); }
window.editNote = editNote; window.removeNote = removeNote;
function monthOptions(){
  var seen = {};
  state.incomes.forEach(function(x){ seen[monthKey(x.date)]=1; });
  state.expenses.forEach(function(x){ seen[monthKey(x.date)]=1; });
  seen[todayStr().slice(0,7)]=1;
  return Object.keys(seen).sort().reverse();
}
/* Main render part A: totals + breakdown */
function render(){
  if(!state) return showSetup(false);
  applyTheme();
  bindNotifUIOnce();
  refreshNotifUI();
  scheduleDailyReminder();
  checkRecurring(true);
  $('setup').classList.add('hidden'); $('app').classList.remove('hidden');
  var income = state.incomes.reduce(function(s,x){ return s+x.amount; }, 0);
  var spent = state.expenses.reduce(function(s,x){ return s+x.amount; }, 0);
  var total = state.start + income;
  var balance = total - spent;
  $('balance').textContent = inr(balance);
  $('balance').classList.toggle('low', balance < 0);
  $('sStart').textContent = inr(state.start);
  $('sIncome').textContent = inr(income);
  $('sSpent').textContent = inr(spent);
  $('balanceNote').textContent = balance<0 ? 'You have spent more than you have.' : (state.incomes.length ? state.incomes.length + ' income entries so far.' : 'Add your first income to get started.');
  $('meterFill').style.width = total>0 ? Math.min(100, spent/total*100)+'%' : '0%';
  var mk = todayStr().slice(0,7);
  var mInc = state.incomes.filter(function(x){ return monthKey(x.date)===mk; }).reduce(function(s,x){ return s+x.amount; }, 0);
  var mExp = state.expenses.filter(function(x){ return monthKey(x.date)===mk; }).reduce(function(s,x){ return s+x.amount; }, 0);
  var monthSpentByCat = {};
  state.expenses.forEach(function(x){ if(monthKey(x.date)===mk) monthSpentByCat[x.cat]=(monthSpentByCat[x.cat]||0)+x.amount; });
  $('mSummary').textContent = 'Income ' + inr(mInc) + ' · Spent ' + inr(mExp) + ' · Left ' + inr(mInc-mExp);
  var totals = {}; state.expenses.forEach(function(x){ totals[x.cat]=(totals[x.cat]||0)+x.amount; });
  var rows = CATEGORIES.filter(function(c){ return totals[c.id]; }).sort(function(a,b){ return totals[b.id]-totals[a.id]; });
  $('breakdown').innerHTML = rows.length ? rows.map(function(c){
    var pct = spent>0 ? totals[c.id]/spent*100 : 0;
    return '<div class="b-row" style="--c:'+c.color+'"><div class="b-top"><span>'+c.icon+' '+c.label+'</span><span>'+inr(totals[c.id])+' <small>'+pct.toFixed(0)+'%</small></span></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>';
  }).join('') : '<p class="empty">No spending yet. Add your first expense to see the split.</p>';
  renderList(monthSpentByCat);
}
/* Main render part B: list + recurring + notes + init */
function setToggle(id, total, limit, expanded){
  var b = $(id); if(!b) return;
  if(total > limit){ b.classList.remove('hidden'); b.textContent = expanded ? 'Show less' : 'Show all ('+total+')'; }
  else b.classList.add('hidden');
}
function renderList(monthSpentByCat){
  var months = monthOptions();
  var curSel = $('monthFilter').value || 'all';
  $('monthFilter').innerHTML = '<option value="all">All months</option>' + months.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
  if(curSel==='all' || months.indexOf(curSel)>=0) $('monthFilter').value = curSel;
  var mf = $('monthFilter').value || 'all';
  var f = $('filter').value || 'all';
  var q = ($('search').value||'').toLowerCase();
  var shown = [];
  state.incomes.forEach(function(x){ shown.push({kind:'income', id:x.id, date:x.date, amount:x.amount, title:x.source||'Income', sub:x.note||''}); });
  state.expenses.forEach(function(x){ var c=catOf(x.cat); shown.push({kind:'expense', id:x.id, date:x.date, amount:x.amount, title:x.note||c.label, sub:(c.label+(x.sub?' - '+x.sub:'')), cat:x.cat, color:c.color, icon:c.icon}); });
  shown.sort(function(a,b){ return b.date.localeCompare(a.date) || b.id-a.id; });
  shown = shown.filter(function(x){
    if(mf!=='all' && monthKey(x.date)!==mf) return false;
    if(f!=='all' && !(f==='income' ? x.kind==='income' : x.cat===f)) return false;
    if(q && (String(x.title||'')+' '+String(x.sub||'')).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  var tc = $('txCount'); if(tc) tc.textContent = shown.length ? '('+shown.length+')' : '';
  var visTx = showAllTx ? shown : shown.slice(0, TX_LIMIT);
  $('list').innerHTML = shown.length ? visTx.map(function(x){
    if(x.kind==='income') return '<li class="item"><div class="ico">💰</div><div class="meta"><b>+'+esc(x.title)+'</b><small>Income · '+fmtDate(x.date)+(x.sub?' · '+esc(x.sub):'')+'</small></div><span class="amt plus">+'+inr(x.amount)+'</span><button class="del" onclick="removeIncome('+x.id+')">×</button></li>';
    return '<li class="item" style="--c:'+x.color+'"><div class="ico">'+x.icon+'</div><div class="meta"><b>'+esc(x.title)+'</b><small>'+esc(x.sub)+' · '+fmtDate(x.date)+'</small></div><span class="amt">−'+inr(x.amount)+'</span><button class="del" onclick="removeExpense('+x.id+')">×</button></li>';
  }).join('') : '<li class="empty">Nothing here yet.</li>';
  setToggle('listToggle', shown.length, TX_LIMIT, showAllTx);
  var recs = [];
  state.incomes.forEach(function(x){ if(x.recurring) recs.push({t:'Income', label:(x.source||'Income'), amount:x.amount, date:x.date}); });
  state.expenses.forEach(function(x){ if(x.recurring){ var c=catOf(x.cat); recs.push({t:'Expense', label:(c.label+(x.sub?' - '+x.sub:'')), amount:x.amount, date:x.date}); } });
  var visRec = showAllRec ? recs : recs.slice(0, REC_LIMIT);
  $('recList').innerHTML = recs.length ? visRec.map(function(r){ return '<li class="item"><div class="ico">🔁</div><div class="meta"><b>'+esc(r.label)+'</b><small>'+r.t+' · last '+fmtDate(r.date)+'</small></div><span class="amt">'+inr(r.amount)+'/mo</span></li>'; }).join('') : '<li class="empty">No recurring items yet.</li>';
  setToggle('recToggle', recs.length, REC_LIMIT, showAllRec);
  renderBudgets(monthSpentByCat);
  var nc = $('notesCount'); if(nc) nc.textContent = state.notes.length ? '('+state.notes.length+')' : '';
  var visNotes = showAllNotes ? state.notes : state.notes.slice(0, NOTES_LIMIT);
  $('notesList').innerHTML = state.notes.length ? visNotes.map(function(n){
    return '<li class="item note-card"><div class="ico">📝</div><div class="meta"><b>'+(esc(n.title)||'Untitled')+'</b><p>'+esc(n.content)+'</p><small>'+fmtDate(n.date)+'</small></div><div><button class="mini" onclick="editNote('+n.id+')">Edit</button><button class="mini danger" onclick="removeNote('+n.id+')">Delete</button></div></li>';
  }).join('') : '<li class="empty">No notes yet. Your notes stay separate from money.</li>';
  setToggle('notesToggle', state.notes.length, NOTES_LIMIT, showAllNotes);
}
$('resetBtn').onclick = function(){ if(confirm('Delete all data and start over?')){ try{localStorage.removeItem(KEY);}catch(e){} state=null; editingNoteId=null; showSetup(false); } };
$('exportBtn').onclick = exportCSV;
$('importBtn').onclick = pickFile;
$('importBtn2').onclick = pickFile;
$('csvFile').onchange = function(e){ if(e.target.files[0]) importCSV(e.target.files[0]); e.target.value=''; };
/* Offline notifications engine — 100% on-device, no internet. */
function notifyPrefs(){ if(!state) return {enabled:true, daily:true, time:'21:00', budget:true, balance:true, lowBalance:500, recurring:true, fired:{}}; if(!state.notify) state.notify = {enabled:true, daily:true, time:'21:00', budget:true, balance:true, lowBalance:500, recurring:true, fired:{}}; return state.notify; }
function notifyOn(){ if(!state) return false; var p = notifyPrefs(); return !!(p && p.enabled); }
function fireLocal(id, title, body){
  if(!notifyOn()) return;
  try { if(window.PLNotify && window.PLNotify.instant) { window.PLNotify.instant(id, title, body); } } catch(e){}
}
function balanceNow(){
  var income = state.incomes.reduce(function(s,x){ return s+x.amount; }, 0);
  var spent = state.expenses.reduce(function(s,x){ return s+x.amount; }, 0);
  return (state.start + income) - spent;
}
function hashStr(s){ var h=0; s=String(s||''); for(var i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; } return h; }
function scheduleDailyReminder(){
  try {
    if(!state || !notifyOn()) return;
    var p = notifyPrefs();
    if(!p.daily) { if(window.PLNotify) window.PLNotify.cancel([9301]); return; }
    var parts = String(p.time||'21:00').split(':');
    var h = Math.max(0, Math.min(23, Number(parts[0])||21));
    var m = Math.max(0, Math.min(59, Number(parts[1])||0));
    if(window.PLNotify && window.PLNotify.scheduleDaily){
      window.PLNotify.scheduleDaily(9301, "Log today's expenses", 'Pocket Ledger daily reminder - 1 min to stay on track.', h, m);
    }
  } catch(e){}
}
function checkAlerts(kind, catId){
  try {
    if(!state || !notifyOn()) return;
    var p = notifyPrefs();
    if(!p.fired || typeof p.fired!=='object') p.fired = {};
    var mk = todayStr().slice(0,7);
    var ms = {};
    state.expenses.forEach(function(x){ if(monthKey(x.date)===mk) ms[x.cat]=(ms[x.cat]||0)+x.amount; });
    if(p.budget){
      var cats = (kind==='budget' && catId) ? [catId] : Object.keys(state.budgets||{});
      cats.forEach(function(k){
        var limit = Number(state.budgets[k])||0; if(!(limit>0)) return;
        var spent = Number(ms[k])||0;
        var c = catOf(k);
        var key100 = 'b100:'+mk+':'+k, key80 = 'b80:'+mk+':'+k;
        if(spent > limit && !p.fired[key100]){
          p.fired[key100]=1; save();
          fireLocal(1000+Math.abs(hashStr(k))%8000, 'Over budget: '+c.label, c.icon+' '+inr(spent)+' of '+inr(limit)+' spent this month.');
        } else if(spent >= limit*0.8 && spent <= limit && !p.fired[key80]){
          p.fired[key80]=1; save();
          fireLocal(2000+Math.abs(hashStr(k))%8000, 'Near budget limit: '+c.label, c.icon+' '+inr(spent)+' of '+inr(limit)+' ('+Math.round(spent/limit*100)+'%).');
        }
      });
    }
    if(p.balance && (kind==='expense' || kind==='budget' || kind==='income')){
      var bal = balanceNow();
      var th = Number(p.lowBalance); if(!(th>=0)) th = 0;
      var keyB = 'low:'+mk+':'+String(th);
      if(bal < th && !p.fired[keyB]){
        p.fired[keyB]=1; save();
        fireLocal(9101, 'Low balance: '+inr(bal), bal<0 ? 'You have spent more than you have.' : 'Balance dropped below '+inr(th)+'.');
      }
      if(bal < 0 && !p.fired['neg:'+mk]){
        p.fired['neg:'+mk]=1; save();
        fireLocal(9102, 'Balance negative', 'You have spent more than you have ('+inr(bal)+').');
      }
    }
    checkRecurring(true);
    scheduleDailyReminder();
  } catch(e){}
}
function checkRecurring(onlyIfEnabled){
  try {
    if(!state || !notifyOn()) return;
    var p = notifyPrefs();
    if(onlyIfEnabled && !p.recurring) return;
    if(!p.fired || typeof p.fired!=='object') p.fired = {};
    var today = todayStr();
    if(p.fired['rec:'+today]) return;
    var recs = [];
    state.incomes.forEach(function(x){ if(x.recurring) recs.push({t:'Income', label:(x.source||'Income'), amount:x.amount, date:x.date}); });
    state.expenses.forEach(function(x){ if(x.recurring){ var c=catOf(x.cat); recs.push({t:'Expense', label:(c.label+(x.sub?' - '+x.sub:'')), amount:x.amount, date:x.date}); } });
    if(!recs.length) return;
    var day = Number(today.slice(8,10))||1;
    var due = recs.filter(function(r){
      var d = Number(String(r.date||'').slice(8,10))||0;
      if(!d) return false;
      var diff = d - day;
      return diff >= 0 && diff <= 2;
    });
    if(due.length){
      p.fired['rec:'+today]=1; save();
      var first = due[0];
      if(due.length===1) fireLocal(9201, 'Recurring due: '+first.label, first.t+' '+inr(first.amount)+' expected around day '+first.date.slice(8,10)+'.');
      else fireLocal(9201, due.length+' recurring payments due soon', first.label+' '+inr(first.amount)+' + '+(due.length-1)+' more in next 2 days.');
    }
  } catch(e){}
}
function refreshNotifUI(){
  try {
    var p = notifyPrefs();
    if($('notifEnable')) $('notifEnable').checked = p.enabled !== false;
    if($('notifDaily')) $('notifDaily').checked = p.daily !== false;
    if($('notifTime')) $('notifTime').value = p.time || '21:00';
    if($('notifBudget')) $('notifBudget').checked = p.budget !== false;
    if($('notifBalance')) $('notifBalance').checked = p.balance !== false;
    if($('notifLow')) $('notifLow').value = (p.lowBalance==null?'':p.lowBalance);
    if($('notifRecurring')) $('notifRecurring').checked = p.recurring !== false;
    updateNotifState('Settings loaded.');
  } catch(e){}
}
function updateNotifState(msg){
  try {
    var el = $('notifState'); if(!el) return;
    var native = (window.PLNotify && window.PLNotify.isNative && window.PLNotify.isNative());
    var perm = 'n/a';
    try { if(window.PLNotify && window.PLNotify.canWebNotify && window.PLNotify.canWebNotify()) perm = Notification.permission; } catch(e){}
    el.textContent = (native ? 'Mode: Android offline (works app-closed). ' : 'Mode: Web alerts (open app; install Android APK for closed-app reminders). ') + (msg||'') + (perm!=='n/a' ? ' Browser: '+perm+'.' : '');
  } catch(e){}
}
var notifBound = false;
function bindNotifUIOnce(){ if(notifBound) return; notifBound = true; bindNotifUI(); }
function bindNotifUI(){
  try {
    if(!$('notifEnable')) return;
    var ids = ['notifEnable','notifDaily','notifTime','notifBudget','notifBalance','notifLow','notifRecurring'];
    var onChange = function(){
      var p = notifyPrefs();
      p.enabled = !!$('notifEnable').checked;
      p.daily = !!$('notifDaily').checked;
      p.time = ($('notifTime').value||'21:00');
      p.budget = !!$('notifBudget').checked;
      p.balance = !!$('notifBalance').checked;
      var lv = parseFloat($('notifLow').value);
      p.lowBalance = isNaN(lv) ? 0 : Math.max(0, lv);
      p.recurring = !!$('notifRecurring').checked;
      save();
      if(!p.enabled){ if(window.PLNotify) window.PLNotify.cancel([9301]); updateNotifState('Notifications off.'); toast('Notifications off'); return; }
      scheduleDailyReminder();
      updateNotifState('Saved. Daily at '+p.time+'.');
      toast('Notification settings saved');
    };
    ids.forEach(function(id){ var el = $(id); if(el) el.addEventListener('change', onChange); });
    if($('notifPermBtn')) $('notifPermBtn').onclick = function(){
      if(!window.PLNotify) return;
      Promise.resolve(window.PLNotify.requestPermission()).then(function(ok){
        if(ok){ updateNotifState('Permission granted. Offline alerts on.'); toast('Notifications enabled'); scheduleDailyReminder(); }
        else {
          var prot = location.protocol;
          var hint = (prot === 'file:')
            ? 'Browser blocks notifications on file://. Run via localhost (VS Code Live Server: right-click index.html > Open with Live Server) then Allow.'
            : 'Blocked. Click the lock/tune icon in the address bar > Notifications > Allow, then tap Enable again.';
          updateNotifState('Blocked. ' + hint); toast('Permission blocked — see note below');
        }
      });
    };
    if($('notifTestBtn')) $('notifTestBtn').onclick = function(){
      if(!$('notifEnable').checked){ toast('Turn on Enable notifications first'); return; }
      if(!window.PLNotify) return;
      var prot = location.protocol;
      Promise.resolve(window.PLNotify.instant(9999, 'Pocket Ledger test', 'Offline alerts work. No internet needed.')).then(function(r){
        if(r === 'web' || r === 'web-sw' || r === 'native'){ toast('Test notification sent'); updateNotifState('Test sent (' + r + '). Check your notification tray.'); }
        else if(String(r||'').indexOf('need-permission') === 0){ toast('Tap Enable notifications first, then Allow'); updateNotifState('Tap Enable notifications above and choose Allow in the browser prompt.'); }
        else if(r === 'denied'){ updateNotifState('Blocked. Click the lock icon in the address bar > Notifications > Allow, then reload.'); toast('Blocked — allow in address bar'); }
        else if(r === 'no-api'){ updateNotifState('This browser/file mode has no Notification API. Use Chrome via localhost or the Android APK.'); toast('No notification API here'); }
        else { toast('System blocked it — showing in-app instead'); updateNotifState('System response: ' + r + (prot === 'file:' ? ' If file://, use Live Server (localhost) instead.' : ' Check site notification permission.')); }
      });
    };
  } catch(e){}
}
buildCatPicker();
/* Add Expense / Income tabs — expense open by default */
function switchAddTab(which){
  var isExp = (which !== 'inc');
  var te = $('tabExp'), ti = $('tabInc'), ev = $('expView'), iv = $('incView');
  if(te){ te.classList.toggle('active', isExp); te.setAttribute('aria-selected', String(isExp)); }
  if(ti){ ti.classList.toggle('active', !isExp); ti.setAttribute('aria-selected', String(!isExp)); }
  if(ev) ev.classList.toggle('hidden', !isExp);
  if(iv) iv.classList.toggle('hidden', isExp);
}
if($('tabExp')) $('tabExp').onclick = function(){ switchAddTab('exp'); };
if($('tabInc')) $('tabInc').onclick = function(){ switchAddTab('inc'); };
switchAddTab('exp');
$('filter').innerHTML = '<option value="all">All categories</option><option value="income">Income only</option>' + CATEGORIES.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('');
$('filter').onchange = function(){ showAllTx=false; render(); };
$('monthFilter').onchange = function(){ showAllTx=false; render(); };
$('search').oninput = function(){ showAllTx=false; render(); };
/* Collapsible toggles — keep home short */
function wireToggle(id, fn, noRender){
  var b = $(id); if(!b) return;
  b.onclick = function(e){ if(e) e.stopPropagation(); fn(); if(!noRender) render(); };
}
wireToggle('listToggle', function(){ showAllTx = !showAllTx; });
wireToggle('notesToggle', function(){ showAllNotes = !showAllNotes; });
wireToggle('recToggle', function(){ showAllRec = !showAllRec; });
wireToggle('budgetToggle', function(){ showAllBudgets = !showAllBudgets; });
function setCollapsed(bodyId, btnId, headId, collapsed){
  var body = $(bodyId), btn = $(btnId), head = $(headId);
  if(body) body.classList.toggle('hidden', collapsed);
  if(btn) btn.textContent = collapsed ? 'Show' : 'Hide';
  if(btn) btn.setAttribute('aria-expanded', String(!collapsed));
  if(head) head.setAttribute('aria-expanded', String(!collapsed));
}
wireToggle('budgetHeadToggle', function(){
  var b = $('budgetBody'); var willHide = b ? !b.classList.contains('hidden') : true;
  setCollapsed('budgetBody','budgetHeadToggle',null,willHide);
}, true);
wireToggle('recHeadToggle', function(){
  var b = $('recBody'); var willHide = b ? !b.classList.contains('hidden') : true;
  setCollapsed('recBody','recHeadToggle',null,willHide);
}, true);
function toggleNotif(force){
  var body = $('notifBody'); if(!body) return;
  var isHidden = body.classList.contains('hidden');
  var show = (typeof force==='boolean') ? force : isHidden;
  setCollapsed('notifBody','notifToggle','notifHead',!show);
}
if($('notifToggle')) $('notifToggle').onclick = function(e){ if(e) e.stopPropagation(); toggleNotif(); };
if($('notifHead')){
  $('notifHead').onclick = function(){ toggleNotif(); };
  $('notifHead').onkeydown = function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleNotif(); } };
}
$('budgetCat').innerHTML = CATEGORIES.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('');
try{ $('date').value = todayStr(); $('incDate').value = todayStr(); }catch(e){}
render();
