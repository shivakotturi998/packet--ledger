const CATEGORIES = [
  {id:'food',label:'Food',icon:'🍽️',color:'#E8792B'},
  {id:'grocery',label:'Grocery',icon:'🛒',color:'#2E9E5B'},
  {id:'fuel',label:'Fuel',icon:'⛽',color:'#7A5AF8'},
  {id:'entertainment',label:'Fun',icon:'🎬',color:'#D9418C'},
  {id:'wants',label:'Wants',icon:'🛍️',color:'#0E9AA7'},
  {id:'household',label:'Household',icon:'🏠',color:'#B7791F'},
  {id:'bills',label:'Bills',icon:'💡',color:'#3B82F6'},
  {id:'other',label:'Other',icon:'📦',color:'#6B7280'}
];
const KEY = 'pocket-ledger-v1';
const $ = id => document.getElementById(id);
const inr = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2});
const catOf = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[7];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uid = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

function loadState(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.start !== 'number' || typeof s.salary !== 'number' || !Array.isArray(s.expenses)) return null;
    s.salariesReceived = Math.max(1, Math.round(Number(s.salariesReceived) || 1));
    return s;
  } catch { return null; }
}
let state = loadState();
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast('Storage full or blocked — export a CSV backup'); }
}

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Setup ---------- */
function showSetup(editing){
  $('setup').classList.remove('hidden'); $('app').classList.add('hidden');
  $('startInput').value = editing ? state.start : '';
  $('salaryInput').value = editing ? state.salary : '';
}
$('startBtn').onclick = () => {
  const start = parseFloat($('startInput').value), salary = parseFloat($('salaryInput').value);
  if (isNaN(start) || start < 0 || isNaN(salary) || salary <= 0){
    $('setupErr').textContent = 'Enter a starting balance (0 or more) and a monthly salary above 0.'; return;
  }
  $('setupErr').textContent = '';
  if (state){ state.start = start; state.salary = salary; }
  else state = {start, salary, salariesReceived:1, expenses:[]}; // first month's salary counted
  save(); render();
};
$('editBtn').onclick = () => showSetup(true);
$('resetBtn').onclick = () => {
  if (confirm('Delete all data and start over?')){ localStorage.removeItem(KEY); state = null; showSetup(false); }
};

/* ---------- Actions ---------- */
$('salaryBtn').onclick = () => {
  state.salariesReceived++; save(); render(); toast(inr(state.salary) + ' salary added');
};
$('expForm').onsubmit = e => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  const dateVal = $('date').value;
  const cat = document.querySelector('input[name=cat]:checked');
  if (!cat){ $('formErr').textContent = 'Pick a category.'; return; }
  if (isNaN(amount) || amount <= 0){ $('formErr').textContent = 'Enter an amount above 0.'; return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)){ $('formErr').textContent = 'Pick a valid date.'; return; }
  $('formErr').textContent = '';
  state.expenses.unshift({id:uid(), cat:cat.value, amount, note:$('note').value.trim(), date:dateVal});
  state.expenses.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  save(); $('amount').value = ''; $('note').value = ''; render(); toast('Expense added');
};
function removeExpense(id){
  state.expenses = state.expenses.filter(x => x.id !== id); save(); render(); toast('Expense deleted');
}
window.removeExpense = removeExpense; // needed for inline onclick in WebView/Capacitor

/* ---------- CSV export / import ---------- */
const csvCell = v => /[",\n\r]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

function exportCSV(){
  const rows = [['type','date','category','amount','note'],
    ['SETUP','','starting_balance',state.start,''],
    ['SETUP','','monthly_salary',state.salary,''],
    ['SETUP','','salaries_received',state.salariesReceived,'']];
  state.expenses.forEach(x => rows.push(['EXPENSE', x.date, x.cat, x.amount, x.note]));
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'pocket-ledger-' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Backup downloaded');
}

function parseCSV(text){
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^\ufeff/, '');
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){
      if (ch === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ','){ row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r'){
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(cell); cell = ''; if (row.some(v => v !== '')) rows.push(row); row = [];
    } else cell += ch;
  }
  row.push(cell); if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

function importCSV(file){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCSV(reader.result);
      if (!rows.length || rows[0][0].trim().toLowerCase() !== 'type') throw new Error('bad header');
      const next = {start:0, salary:0, salariesReceived:1, expenses:[]};
      const validCats = CATEGORIES.map(c => c.id);
      let gotSetup = false;
      rows.slice(1).forEach((r, i) => {
        const [type, date, cat, amount, note] = r;
        const num = parseFloat(amount);
        if (type === 'SETUP'){
          if (isNaN(num)) throw new Error('bad setup value');
          if (cat === 'starting_balance') next.start = num;
          if (cat === 'monthly_salary') next.salary = num;
          if (cat === 'salaries_received') next.salariesReceived = Math.max(1, Math.round(num));
          gotSetup = true;
        } else if (type === 'EXPENSE'){
          if (isNaN(num) || num <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test((date || '').trim())) throw new Error('bad expense on row ' + (i + 2));
          next.expenses.push({id:uid() + i, cat: validCats.includes((cat || '').trim()) ? cat.trim() : 'other', amount:num, note:(note || '').slice(0,60), date:date.trim()});
        }
      });
      if (!gotSetup || !(next.salary > 0) || !(next.start >= 0)) throw new Error('no setup rows');
      if (state && !confirm('Replace your current data with this backup?')) return;
      next.expenses.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
      state = next; save(); render(); toast('Backup restored');
    } catch (e) {
      alert('That file could not be read. Use a CSV that was exported from Pocket Ledger.');
    }
  };
  reader.readAsText(file);
}

const pickFile = () => $('csvFile').click();
$('exportBtn').onclick = exportCSV;
$('importBtn').onclick = pickFile;
$('importBtn2').onclick = pickFile;
$('csvFile').onchange = e => { if (e.target.files[0]) importCSV(e.target.files[0]); e.target.value = ''; };

/* ---------- Render ---------- */
function render(){
  if (!state) return showSetup(false);
  $('setup').classList.add('hidden'); $('app').classList.remove('hidden');
  const income = state.start + state.salary * state.salariesReceived;
  const spent = state.expenses.reduce((s,x) => s + x.amount, 0);
  const balance = income - spent;

  $('balance').textContent = inr(balance);
  $('balance').classList.toggle('low', balance < 0);
  $('sStart').textContent = inr(state.start);
  $('sSalary').textContent = inr(state.salary * state.salariesReceived);
  $('sSpent').textContent = inr(spent);
  $('balanceNote').textContent = balance < 0 ? 'You have spent more than you have.'
    : 'Salary added ' + state.salariesReceived + (state.salariesReceived === 1 ? ' time' : ' times') + ' so far.';
  $('meterFill').style.width = income > 0 ? Math.min(100, spent / income * 100) + '%' : '0%';

  // Breakdown
  const totals = {}; state.expenses.forEach(x => totals[x.cat] = (totals[x.cat] || 0) + x.amount);
  const rows = CATEGORIES.filter(c => totals[c.id]).sort((a,b) => totals[b.id] - totals[a.id]);
  $('breakdown').innerHTML = rows.length ? rows.map(c => {
    const pct = totals[c.id] / spent * 100;
    return `<div class="b-row" style="--c:${c.color}">
      <div class="b-top"><span>${c.icon} ${c.label}</span><span>${inr(totals[c.id])} <small>${pct.toFixed(0)}%</small></span></div>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('') : '<p class="empty">No spending yet. Add your first expense to see the split.</p>';

  // List
  const f = $('filter').value || 'all';
  const shown = state.expenses.filter(x => f === 'all' || x.cat === f);
  $('list').innerHTML = shown.length ? shown.map(x => {
    const c = catOf(x.cat);
    const d = new Date(x.date + 'T00:00').toLocaleDateString('en-IN', {day:'numeric', month:'short'});
    return `<li class="item" style="--c:${c.color}">
      <div class="ico">${c.icon}</div>
      <div class="meta"><b>${esc(x.note) || c.label}</b><small>${c.label} · ${d}</small></div>
      <span class="amt">−${inr(x.amount)}</span>
      <button class="del" aria-label="Delete expense" onclick="removeExpense(${x.id})">×</button></li>`;
  }).join('') : '<li class="empty">Nothing here yet.</li>';
}

/* ---------- Init ---------- */
$('catPicker').innerHTML = CATEGORIES.map((c,i) =>
  `<label class="cat" style="--c:${c.color}"><input type="radio" name="cat" value="${c.id}" ${i===0?'checked':''}><span><em>${c.icon}</em>${c.label}</span></label>`).join('');
$('filter').innerHTML = '<option value="all">All categories</option>' + CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
$('filter').onchange = render;
try { $('date').value = new Date().toISOString().slice(0,10); } catch {}
render();
