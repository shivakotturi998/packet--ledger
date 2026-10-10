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
function blankState(){ return {start:0, incomes:[], expenses:[], notes:[], budgets:{}, theme:'light'}; }
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
  save(); $('amount').value=''; $('note').value=''; $('expRecurring').checked=false; render(); toast('Expense added');
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
  save(); $('incAmount').value=''; $('incSource').value=''; $('incNote').value=''; $('incRecurring').checked=false; render(); toast('Income added');
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
  state.budgets[cat]=amt; save(); $('budgetAmt').value=''; render(); toast('Budget saved');
});
function removeBudget(cat){ delete state.budgets[cat]; save(); render(); }
window.removeBudget = removeBudget;
function renderBudgets(monthSpent){
  var box = $('budgets');
  var keys = Object.keys(state.budgets||{});
  if(!keys.length){ box.innerHTML = '<p class="empty">No budgets yet. Set one above.</p>'; return; }
  box.innerHTML = keys.map(function(k){
    var c = catOf(k), limit = state.budgets[k], spent = monthSpent[k]||0;
    var pct = limit>0 ? Math.min(100, spent/limit*100) : 0;
    var cls = spent>limit ? 'budget over' : (spent>=limit*0.8 ? 'budget warn' : 'budget');
    var msg = spent>limit ? 'Over budget' : (spent>=limit*0.8 ? 'Near limit' : 'On track');
    return '<div class="'+cls+'"><div class="b-top"><span>'+c.icon+' '+c.label+'</span><button class="mini danger" onclick="removeBudget(\''+k+'\')">Remove</button></div><div>'+inr(spent)+' of '+inr(limit)+' ('+pct.toFixed(0)+'%) - '+msg+'</div><div class="bar" style="--c:'+c.color+'"><i style="width:'+pct+'%"></i></div></div>';
  }).join('');
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
  $('list').innerHTML = shown.length ? shown.map(function(x){
    if(x.kind==='income') return '<li class="item"><div class="ico">💰</div><div class="meta"><b>+'+esc(x.title)+'</b><small>Income · '+fmtDate(x.date)+(x.sub?' · '+esc(x.sub):'')+'</small></div><span class="amt plus">+'+inr(x.amount)+'</span><button class="del" onclick="removeIncome('+x.id+')">×</button></li>';
    return '<li class="item" style="--c:'+x.color+'"><div class="ico">'+x.icon+'</div><div class="meta"><b>'+esc(x.title)+'</b><small>'+esc(x.sub)+' · '+fmtDate(x.date)+'</small></div><span class="amt">−'+inr(x.amount)+'</span><button class="del" onclick="removeExpense('+x.id+')">×</button></li>';
  }).join('') : '<li class="empty">Nothing here yet.</li>';
  var recs = [];
  state.incomes.forEach(function(x){ if(x.recurring) recs.push({t:'Income', label:(x.source||'Income'), amount:x.amount, date:x.date}); });
  state.expenses.forEach(function(x){ if(x.recurring){ var c=catOf(x.cat); recs.push({t:'Expense', label:(c.label+(x.sub?' - '+x.sub:'')), amount:x.amount, date:x.date}); } });
  $('recList').innerHTML = recs.length ? recs.map(function(r){ return '<li class="item"><div class="ico">🔁</div><div class="meta"><b>'+esc(r.label)+'</b><small>'+r.t+' · last '+fmtDate(r.date)+'</small></div><span class="amt">'+inr(r.amount)+'/mo</span></li>'; }).join('') : '<li class="empty">No recurring items yet.</li>';
  renderBudgets(monthSpentByCat);
  $('notesList').innerHTML = state.notes.length ? state.notes.map(function(n){
    return '<li class="item note-card"><div class="ico">📝</div><div class="meta"><b>'+(esc(n.title)||'Untitled')+'</b><p>'+esc(n.content)+'</p><small>'+fmtDate(n.date)+'</small></div><div><button class="mini" onclick="editNote('+n.id+')">Edit</button><button class="mini danger" onclick="removeNote('+n.id+')">Delete</button></div></li>';
  }).join('') : '<li class="empty">No notes yet. Your notes stay separate from money.</li>';
}
$('resetBtn').onclick = function(){ if(confirm('Delete all data and start over?')){ try{localStorage.removeItem(KEY);}catch(e){} state=null; editingNoteId=null; showSetup(false); } };
$('exportBtn').onclick = exportCSV;
$('importBtn').onclick = pickFile;
$('importBtn2').onclick = pickFile;
$('csvFile').onchange = function(e){ if(e.target.files[0]) importCSV(e.target.files[0]); e.target.value=''; };
buildCatPicker();
$('filter').innerHTML = '<option value="all">All categories</option><option value="income">Income only</option>' + CATEGORIES.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('');
$('filter').onchange = render;
$('monthFilter').onchange = render;
$('search').oninput = render;
$('budgetCat').innerHTML = CATEGORIES.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('');
try{ $('date').value = todayStr(); $('incDate').value = todayStr(); }catch(e){}
render();
