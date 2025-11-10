// Simple localStorage-backed prototype logic
const STORAGE_KEY = 'isv_change_requests_v1';
const form = document.getElementById('requestForm');
const tableBody = document.querySelector('#requestsTable tbody');
const adminList = document.getElementById('adminList');
const exportCsvBtn = document.getElementById('exportCsv');
const resetBtn = document.getElementById('resetDemo');

function loadRequests(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }catch(e){return []}
}
function saveRequests(arr){localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));}
function genId(){return 'REQ-'+Date.now().toString().slice(-6);} // simple id

function renderTable(){
  const items = loadRequests();
  tableBody.innerHTML = '';
  items.slice().reverse().forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${it.requestId}</td><td>${escapeHtml(it.title)}</td><td>${escapeHtml(it.requestedBy||it.requestorName)}</td><td>${escapeHtml(it.department)}</td><td>${escapeHtml(it.status)}</td><td>${escapeHtml(it.priority)}</td><td>${new Date(it.dateRequested||it.submittedDate).toLocaleString()}</td>`;
    tableBody.appendChild(tr);
  });
}

function renderAdmin(filterStatus=''){
  const items = loadRequests();
  adminList.innerHTML = '';
  items.slice().reverse().filter(it => !filterStatus || it.status===filterStatus).forEach(it => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<strong>${it.requestId} — ${escapeHtml(it.title)}</strong> <span class="status-badge">${escapeHtml(it.status)}</span>
      <div><small>Requested By: ${escapeHtml(it.requestedBy||it.requestorName)} • Dept: ${escapeHtml(it.department)} • Priority: ${escapeHtml(it.priority)}</small></div>
      <div style="margin-top:8px">Summary: ${escapeHtml(it.summary)}</div>
         <div style="margin-top:8px">Brief: ${escapeHtml(it.briefDescription||'')}</div>
         <div style="margin-top:8px">System: ${escapeHtml(it.systemName||'')}</div>
         <div style="margin-top:8px">Initiator: ${escapeHtml(it.initiator||'')}</div>
      <div style="margin-top:8px">Assigned To: <input data-id="${it.requestId}" class="assignInput" placeholder="user@fcc.local" value="${escapeHtml(it.assignedTo||'')}"/></div>
      <div style="margin-top:8px">Comments: <input data-id="${it.requestId}" class="commentInput" value="${escapeHtml(it.comments||'')}"/></div>
         <div style="margin-top:8px">Status: <select data-id="${it.requestId}" class="statusSelect"><option>Pending</option><option>Rejected</option><option>Implemented</option></select>
      <button data-id="${it.requestId}" class="saveBtn">Save</button></div>`;
    adminList.appendChild(div);
    // set select to value
    div.querySelector('.statusSelect').value = it.status;
  });
}

function escapeHtml(s){if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

form.addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(form);
  const obj = {};
  for(const [k,v] of fd.entries()) obj[k]=v;
  const requests = loadRequests();
  const now = new Date().toISOString();
  const record = {
    requestId: genId(),
    title: obj.title || '',
    requestedBy: obj.requestedBy || obj.requestorName || '',
    requestorName: obj.requestorName || '',
    requestorEmail: obj.requestorEmail || '',
    dateRequested: obj.dateRequested || now,
    department: obj.department || '',
    summary: obj.summary || '',
  briefDescription: obj.briefDescription || '',
  description: obj.description || '',
    changeType: obj.changeType || '',
    priority: obj.priority || 'Medium',
    targetDate: obj.targetDate || '',
    documents: obj.documents || '',
    spiceWaxRef: obj.spiceWaxRef || '',
    systemName: (obj.systemNameOther && obj.systemName==='Other') ? obj.systemNameOther : (obj.systemName||''),
    policyFormComplete: !!obj.policyFormComplete,
    sopTrainingComplete: !!obj.sopTrainingComplete,
    initiator: obj.initiator || '',
    status: 'Pending',
    assignedTo: '',
    reviewer: '',
    submittedDate: now,
    comments: ''
  };
  requests.push(record);
  saveRequests(requests);
  form.reset();
  renderTable();
  renderAdmin(document.getElementById('filterStatus').value);
  alert('Request submitted (local demo). Request ID: '+record.requestId);
});

document.getElementById('filterStatus').addEventListener('change', e=>{
  renderAdmin(e.target.value);
});

// admin save
adminList.addEventListener('click', e=>{
  if(e.target.classList.contains('saveBtn')){
    const id = e.target.getAttribute('data-id');
    const card = e.target.closest('.card');
    const assigned = card.querySelector('.assignInput').value;
    const comments = card.querySelector('.commentInput').value;
    const status = card.querySelector('.statusSelect').value;
    const items = loadRequests();
    const idx = items.findIndex(x=>x.requestId===id);
    if(idx>=0){items[idx].assignedTo = assigned; items[idx].comments = comments; items[idx].status = status; saveRequests(items); renderTable(); renderAdmin(document.getElementById('filterStatus').value); alert('Saved');}
  }
});

exportCsvBtn.addEventListener('click', ()=>{
  const items = loadRequests();
  if(items.length===0){alert('No items to export');return}
  const headers = ['RequestID','Title','RequestorName','RequestorEmail','Department','Status','Priority','SubmittedDate','TargetDate','AssignedTo','Documents','SpiceWaxRef','Comments'];
  const rows = items.map(it=>headers.map(h=>`"${(it[h.charAt(0).toLowerCase()+h.slice(1)]||'').toString().replace(/"/g,'""')}"`).join(','));
  const csv = headers.join(',')+'\n'+rows.join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='isv-change-requests.csv'; a.click(); URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', ()=>{if(confirm('Clear demo data?')){localStorage.removeItem(STORAGE_KEY); renderTable(); renderAdmin();}});

// tabs
document.querySelectorAll('.tabs button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(b.dataset.tab==='admin'?'tabAdmin':'tabAll').classList.add('active');
  });
});

// initialize
renderTable();
renderAdmin();

// show/hide other system input in prototype form
const sysSelect = document.getElementById('systemNameSelect');
if(sysSelect){
  const otherLabel = document.getElementById('otherSystemLabel');
  const otherInput = document.getElementById('systemNameOther');
  sysSelect.addEventListener('change', ()=>{
    if(sysSelect.value==='Other'){ otherLabel.style.display='block'; } else { otherLabel.style.display='none'; otherInput.value=''; }
  });
}

// quick polyfill for initial demo content
if(loadRequests().length===0){
  const sample = [{requestId:genId(),title:'Update API credentials',requestorName:'Thulani',requestorEmail:'thulani@fcc.local',department:'Information Systems',summary:'Rotate API keys for external service',description:'Keys expire and need rotation',changeType:'Config Change',priority:'High',targetDate:'',documents:'',spiceWaxRef:'',status:'Pending',assignedTo:'',reviewer:'',submittedDate:new Date().toISOString(),comments:''}];
  saveRequests(sample);
  renderTable();renderAdmin();
}