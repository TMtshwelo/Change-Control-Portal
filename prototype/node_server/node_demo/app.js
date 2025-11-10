const apiBase = window.location.origin + '/api';
const refreshBtn = document.getElementById('refresh');
const searchInput = document.getElementById('search');
const dashboardList = document.getElementById('dashboardList');
const summaryCards = document.getElementById('summaryCards');
const filterStatus = document.getElementById('filterStatus');
const filterDept = document.getElementById('filterDept');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
const openSubmit = document.getElementById('openSubmit');
const exportBtn = document.getElementById('exportCsv');

let cache = [];
let statusChart = null;
let deptChart = null;
let timeChart = null;

function escapeHtml(s){if(!s) return ''; return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

async function fetchRequests(){
  try{
    // if we're on the user dashboard and a demo user is signed in, request only that user's requests
    let url = apiBase + '/requests';
    try{
      const demoUser = sessionStorage.getItem('demoUser');
      if(window.location.pathname && window.location.pathname.includes('user_dashboard.html') && demoUser){
        url += '?requestedBy=' + encodeURIComponent(demoUser);
      }
    }catch(_e){}
    const res = await fetch(url);
    if(!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    cache = data;
    return data;
  }catch(e){console.error(e); return []}
}

function summarize(items){
  const total = items.length;
  const byStatus = items.reduce((acc,it)=>{acc[it.status]=(acc[it.status]||0)+1;return acc},{})
  const byDept = items.reduce((acc,it)=>{acc[it.department]=(acc[it.department]||0)+1;return acc},{})
  return {total,byStatus,byDept}
}

function renderSummary(items){
  const s = summarize(items);
  summaryCards.innerHTML = '';
  const cards = [
    {title:'Total Requests', value:s.total},
    {title:'Pending', value:s.byStatus['Pending']||0},
    {title:'Approved', value:s.byStatus['Approved']||0},
    {title:'Implemented', value:s.byStatus['Implemented']||0}
  ];
  cards.forEach(c=>{
    const el = document.createElement('div'); el.className='summary-card'; el.innerHTML = `<h3>${escapeHtml(c.title)}</h3><div class="value">${escapeHtml(c.value)}</div>`; summaryCards.appendChild(el);
  });
}

function statusClass(status){
  if(!status) return 'badge pending';
  const s = status.toLowerCase();
  if(s.includes('approve')) return 'badge approved';
  if(s.includes('reject')) return 'badge rejected';
  return 'badge pending';
}

function renderCards(items){
  dashboardList.innerHTML = '';
  if(items.length===0){ dashboardList.innerHTML = '<p class="muted">No requests match the filters.</p>'; return; }
  items.forEach(it=>{
    const d = document.createElement('div'); d.className='card';
    d.innerHTML = `<h4>${escapeHtml(it.title)}</h4>
      <div class="meta">${escapeHtml(it.requestorName)} • ${escapeHtml(it.department)} • ${escapeHtml(it.priority)}</div>
      <div class="summary">${escapeHtml(it.summary||it.description||'—')}</div>
      <div class="actions"><span class="${statusClass(it.status)}">${escapeHtml(it.status)}</span>
      <div style="margin-left:auto"><button class="btn ghost" data-id="${it.requestId}" data-action="view">View</button> <button class="btn" data-id="${it.requestId}" data-action="assign">Assign</button></div></div>`;
    dashboardList.appendChild(d);
  });
}

function applyFilters(){
  const q = (searchInput.value||'').toLowerCase().trim();
  const status = filterStatus.value;
  const dept = filterDept.value;
  let items = cache.slice();
  if(status) items = items.filter(i=>i.status===status);
  if(dept) items = items.filter(i=>i.department===dept);
  if(q) items = items.filter(i=> (i.title||'').toLowerCase().includes(q) || (i.summary||'').toLowerCase().includes(q) || (i.requestId||'').toLowerCase().includes(q));
  // Only render summary cards on admin dashboard
  if (!window.location.pathname.includes('user_dashboard.html')) {
    renderSummary(items);
  }
  renderCards(items);
}

async function refresh(){
  await fetchRequests();
  applyFilters();
}

dashboardList.addEventListener('click', async (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  const id = b.getAttribute('data-id'); const action = b.getAttribute('data-action');
  const item = cache.find(x=>x.requestId===id);
  if(!item) return;
  if(action==='view') openModal(renderDetails(item));
  if(action==='assign') openModal(renderAssign(item));
});

function openModal(html){ modalContent.innerHTML=''; if(typeof html === 'string') modalContent.innerHTML = html; else modalContent.appendChild(html); modal.classList.remove('hidden'); }
function closeModalFn(){ modal.classList.add('hidden'); modalContent.innerHTML=''; }
closeModal.addEventListener('click', closeModalFn);

function renderDetails(item){
  const wrap = document.createElement('div');
  wrap.innerHTML = `<h3>${escapeHtml(item.title)} <small style="color:var(--muted);">${escapeHtml(item.requestId)}</small></h3>
    <p class="meta">Requested by: ${escapeHtml(item.requestedBy||item.requestorName)} • ${escapeHtml(item.department)} • ${escapeHtml(item.priority)}</p>
    <p><strong>Date requested:</strong> ${escapeHtml((item.dateRequested||item.submittedDate||'').slice(0,10))}</p>
    <p>${escapeHtml(item.briefDescription||item.description||item.summary||'')}</p>
  <p><strong>System:</strong> ${escapeHtml(item.systemName||'')}</p>
  <p><strong>Initiator:</strong> ${escapeHtml(item.initiator||'')}</p>
    <p><strong>Policy form complete:</strong> ${item.policyFormComplete? 'Yes':'No'}</p>
    <p><strong>SOP training complete:</strong> ${item.sopTrainingComplete? 'Yes':'No'}</p>
    <p><strong>Status:</strong> ${escapeHtml(item.status)}</p>
    <div style="margin-top:12px"><button id="closeBtn" class="btn ghost">Close</button></div>`;
  wrap.querySelector('#closeBtn').addEventListener('click', closeModalFn);
  return wrap;
}

function renderAssign(item){
  const div = document.createElement('div');
  div.innerHTML = `<h3>Assign / Update: ${escapeHtml(item.requestId)}</h3>
    <div class="form-row"><input id="assignTo" placeholder="Assign to (email)" value="${escapeHtml(item.assignedTo||'')}" /></div>
    <div style="margin-top:8px" class="form-row"><select id="newStatus"><option>Pending</option><option>Under Review</option><option>Approved</option><option>Rejected</option><option>Implemented</option></select></div>
    <div style="margin-top:12px"><button id="saveAssign" class="btn">Save</button> <button id="cancelAssign" class="btn ghost">Cancel</button></div>`;
  div.querySelector('#newStatus').value = item.status || 'Pending';
  div.querySelector('#saveAssign').addEventListener('click', async ()=>{
    const assignedTo = div.querySelector('#assignTo').value;
    const status = div.querySelector('#newStatus').value;
    await fetch(`${apiBase}/requests/${item.requestId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({assignedTo, status})});
    await refresh(); closeModalFn();
  });
  div.querySelector('#cancelAssign').addEventListener('click', closeModalFn);
  return div;
}

searchInput.addEventListener('input', ()=>applyFilters());
filterStatus.addEventListener('change', ()=>applyFilters());
filterDept.addEventListener('change', ()=>applyFilters());
refreshBtn.addEventListener('click', ()=>refresh());
openSubmit.addEventListener('click', ()=>{
  openModal(renderSubmitForm());
});

exportBtn.addEventListener('click', async ()=>{
  try{
    const res = await fetch(apiBase + '/export');
    if(!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'isv-change-requests.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }catch(e){ alert('Export failed: '+e.message); }
});

// Reports view
function renderReports(){
  const container = document.createElement('div');
    container.innerHTML = `<h3>Reports & Export</h3>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
      <label>Status: <select id="rStatus"><option value="">All</option><option>Pending</option><option>Under Review</option><option>Approved</option><option>Rejected</option><option>Implemented</option></select></label>
      <label>Department: <select id="rDept"><option value="">All</option>
        <option>Information Systems</option>
        <option>Validation</option>
        <option>Human Resources</option>
        <option>Finance</option>
        <option>Regulatory Affairs</option>
        <option>Procurement</option>
        <option>Operational Health and Safety</option>
        <option>Commercial</option>
        <option>Quality Assurance</option>
        <option>Quality Control</option>
        <option>Production</option>
        <option>Engineering</option>
        <option>Research and Development</option>
        <option>Analytical Development</option>
        <option>Supply Chain</option>
        <option>Other</option>
      </select></label>
      <label>From: <input id="rFrom" type="date" /></label>
      <label>To: <input id="rTo" type="date" /></label>
  <button id="rApply" class="btn">Apply</button>
  <button id="rRetry" class="btn">Retry</button>
  <button id="rGen" class="btn">Generate sample data</button>
  <button id="rExport" class="btn">Download CSV</button>
    </div>
    <div id="reportCharts" style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap">
      <div id="chartStatus" style="flex:1;min-width:260px"><canvas id="chartStatusCanvas"></canvas></div>
      <div id="chartDept" style="flex:1;min-width:260px"><canvas id="chartDeptCanvas"></canvas></div>
      <div id="chartTime" style="flex-basis:100%;min-height:200px;margin-top:12px"><canvas id="chartTimeCanvas"></canvas></div>
    </div>
    <div id="reportEmpty" class="report-empty" style="display:none">No data for the selected filters.</div>
  `;

  // wire buttons
  setTimeout(()=>{
    container.querySelector('#rApply').addEventListener('click', async ()=>{
      const s = container.querySelector('#rStatus').value;
      const d = container.querySelector('#rDept').value;
      const f = container.querySelector('#rFrom').value;
      const t = container.querySelector('#rTo').value;
      const params = new URLSearchParams(); if(s) params.append('status', s); if(d) params.append('department', d); if(f) params.append('from', f); if(t) params.append('to', t);
      const url = apiBase + '/requests' + (params.toString()?('?'+params.toString()):'');
      const emptyEl = container.querySelector('#reportEmpty');
      // show loading
      emptyEl.style.display = 'block'; emptyEl.innerHTML = '<span class="spinner"></span> Loading...';
      try{
        const res = await fetch(url); const rows = await res.json();
        if(!rows || rows.length===0){
          emptyEl.style.display = 'block'; emptyEl.innerHTML = 'No data for the selected filters.';
          // clear charts
          if(statusChart){ statusChart.data.labels=[]; statusChart.data.datasets[0].data=[]; statusChart.update(); }
          if(deptChart){ deptChart.data.labels=[]; deptChart.data.datasets[0].data=[]; deptChart.update(); }
          if(timeChart){ timeChart.data.labels=[]; timeChart.data.datasets[0].data=[]; timeChart.update(); }
        } else {
          emptyEl.style.display = 'none';
          renderReportCharts(rows);
        }
      }catch(err){
        emptyEl.style.display = 'block'; emptyEl.innerHTML = 'Error loading data';
        console.error('Reports fetch failed', err);
      }
    });
    container.querySelector('#rRetry').addEventListener('click', async ()=>{
      // simple retry: trigger apply
      container.querySelector('#rApply').click();
    });

    container.querySelector('#rGen').addEventListener('click', async ()=>{
      // generate 6 sample requests across departments and statuses
      const sampleDepts = ['Information Systems','Quality Assurance','Production','Engineering','Research and Development','Supply Chain'];
      const statuses = ['Pending','Under Review','Approved','Implemented'];
      const now = new Date();
      const promises = [];
      for(let i=0;i<6;i++){
        const payload = {
          requestId: 'SAMPLE-'+Date.now().toString().slice(-6)+(i),
          title: 'Sample change '+(i+1),
          requestedBy: 'Demo User',
          requestorName: 'Demo User',
          requestorEmail: 'demo@example.com',
          department: sampleDepts[i%sampleDepts.length],
          summary: 'Auto-generated sample',
          briefDescription: 'Demo data for charts',
          description: 'Generated by demo',
          changeType: 'Enhancement',
          priority: i%2? 'High':'Medium',
          systemName: 'Demo System',
          policyFormComplete: (i%2)? true:false,
          sopTrainingComplete: (i%3===0),
          initiator: 'Demo Initiator',
          status: statuses[i%statuses.length],
          submittedDate: new Date(now.getTime() - (i*24*60*60*1000)).toISOString()
        };
        promises.push(fetch(apiBase + '/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}));
      }
      try{
        await Promise.all(promises);
        await refresh();
        container.querySelector('#rApply').click();
        alert('Sample data generated');
      }catch(e){ console.error('Generate sample failed', e); alert('Generate sample failed: '+e.message); }
    });
    container.querySelector('#rExport').addEventListener('click', ()=>{
      const s = container.querySelector('#rStatus').value;
      const d = container.querySelector('#rDept').value;
      const f = container.querySelector('#rFrom').value;
      const t = container.querySelector('#rTo').value;
      const params = new URLSearchParams(); if(s) params.append('status', s); if(d) params.append('department', d); if(f) params.append('from', f); if(t) params.append('to', t);
      const url = apiBase + '/export' + (params.toString()?('?'+params.toString()):'');
      // trigger download
      const a = document.createElement('a'); a.href = url; a.download = 'isv-change-requests.csv'; document.body.appendChild(a); a.click(); a.remove();
    });
    // initial charts from cached data
    initCharts();
    // if no cached data, show empty message
    const emptyElInit = container.querySelector('#reportEmpty');
    if(!cache || cache.length===0){ emptyElInit.style.display='block'; emptyElInit.innerHTML = 'No data available yet. Use the filters or submit requests.'; }
    else { renderReportCharts(cache); }
  }, 10);

  return container;
}

function initCharts(){
  // create empty charts if not present
  const sCtx = document.getElementById('chartStatusCanvas')?.getContext('2d');
  const dCtx = document.getElementById('chartDeptCanvas')?.getContext('2d');
  const tCtx = document.getElementById('chartTimeCanvas')?.getContext('2d');
  if(sCtx && !statusChart){
    statusChart = new Chart(sCtx, {type:'pie',data:{labels:[],datasets:[{data:[],backgroundColor:[]}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
  }
  if(dCtx && !deptChart){
    deptChart = new Chart(dCtx, {type:'bar',data:{labels:[],datasets:[{label:'Requests',data:[],backgroundColor:'rgba(54,162,235,0.6)'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  }
  if(tCtx && !timeChart){
    timeChart = new Chart(tCtx, {type:'line',data:{labels:[],datasets:[{label:'Requests/day',data:[],borderColor:'rgba(75,192,192,0.9)',fill:false}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});
  }
}

function renderReportCharts(rows){
  rows = rows || [];
  // status counts
  const byStatus = rows.reduce((acc,it)=>{const k=it.status||'Unknown';acc[k]=(acc[k]||0)+1;return acc},{})
  // department counts
  const byDept = rows.reduce((acc,it)=>{const k=it.department||'Other';acc[k]=(acc[k]||0)+1;return acc},{})
  // timeseries: group by date (YYYY-MM-DD)
  const byDate = rows.reduce((acc,it)=>{const d = (it.submittedDate||it.createdAt||'').slice(0,10) || (new Date(it.submittedDate||Date.now()).toISOString().slice(0,10)); acc[d]=(acc[d]||0)+1; return acc;},{});

  // update statusChart
  if(statusChart){
    const labels = Object.keys(byStatus);
    const data = labels.map(l=>byStatus[l]);
    const colors = labels.map((_,i)=>['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949'][i%6]);
    statusChart.data.labels = labels;
    statusChart.data.datasets[0].data = data;
    statusChart.data.datasets[0].backgroundColor = colors;
    statusChart.update();
  }

  // update deptChart
  if(deptChart){
    const labels = Object.keys(byDept);
    const data = labels.map(l=>byDept[l]);
    deptChart.data.labels = labels;
    deptChart.data.datasets[0].data = data;
    deptChart.update();
  }

  // update timeChart (sorted)
  if(timeChart){
    const dates = Object.keys(byDate).sort();
    const data = dates.map(d=>byDate[d]);
    timeChart.data.labels = dates;
    timeChart.data.datasets[0].data = data;
    timeChart.update();
  }
}

// make reports nav open modal
document.querySelectorAll('.nav-link').forEach(a=>{
  a.addEventListener('click', (e)=>{
    const act = a.getAttribute('data-action');
    if(act==='reports'){
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      openModal(renderReports());
    }
  });
});

function renderSubmitForm(){
  const el = document.createElement('div');
  el.innerHTML = `<h3>New Request</h3>
    <div class="form-row"><input id="fTitle" placeholder="Title" /></div>
    <div class="form-row"><input id="fRequestedBy" placeholder="Requested by (name)" /><input id="fEmail" placeholder="Requestor email" /></div>
    <div style="margin-top:8px"><input id="fSummary" placeholder="Summary"/></div>
    <div style="margin-top:8px"><textarea id="fBrief" placeholder="Brief description (short)"></textarea></div>
    <div style="margin-top:8px"><textarea id="fDesc" placeholder="Description (details)"></textarea></div>
    <div style="margin-top:8px;display:flex;gap:8px">
      <select id="fDept"><option>Information Systems</option><option>Validation</option><option>Human Resources</option><option>Finance</option><option>Regulatory Affairs</option><option>Procurement</option><option>Operational Health and Safety</option><option>Commercial</option><option>Quality Assurance</option><option>Quality Control</option><option>Production</option><option>Engineering</option><option>Research and Development</option><option>Analytical Development</option><option>Supply Chain</option><option>Other</option></select>
      <select id="fPriority"><option>Low</option><option selected>Medium</option><option>High</option></select>
    </div>
    <div style="margin-top:8px">
      <label>System: <select id="fSystem"><option value="">-- choose --</option><option>Core Billing</option><option>Customer Portal</option><option>Data Warehouse</option><option>Reporting</option><option>Other</option></select></label>
      <input id="fSystemOther" placeholder="If other, type system name" style="display:none;margin-left:8px" />
    </div>
    <div style="margin-top:8px">
      <input id="fPolicy" type="checkbox" /> User completed policy form
      <input id="fSop" type="checkbox" style="margin-left:12px" /> User received SOP training
    </div>
  <div style="margin-top:8px">Initiator: <input id="fInitiator" /></div>
    <div style="margin-top:12px"><button id="submitNew" class="btn">Submit</button> <button id="cancelNew" class="btn ghost">Cancel</button></div>`;
  el.querySelector('#submitNew').addEventListener('click', async ()=>{
    const sys = el.querySelector('#fSystem').value || '';
    const payload = {
      requestId: 'REQ-'+Date.now().toString().slice(-6),
      title: el.querySelector('#fTitle').value,
      requestedBy: el.querySelector('#fRequestedBy').value,
      requestorEmail: el.querySelector('#fEmail').value,
      department: el.querySelector('#fDept').value,
      summary: el.querySelector('#fSummary').value,
      briefDescription: el.querySelector('#fBrief').value,
      description: el.querySelector('#fDesc').value,
      priority: el.querySelector('#fPriority').value,
      systemName: (sys==='Other') ? (el.querySelector('#fSystemOther').value || '') : sys,
      policyFormComplete: !!el.querySelector('#fPolicy').checked,
      sopTrainingComplete: !!el.querySelector('#fSop').checked,
  initiator: el.querySelector('#fInitiator').value,
      status: 'Pending',
      submittedDate: new Date().toISOString()
    };
    await fetch(`${apiBase}/requests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await refresh(); closeModalFn();
  });
  el.querySelector('#cancelNew').addEventListener('click', closeModalFn);
  // show/hide other system input
  const sysSel = el.querySelector('#fSystem');
  const sysOther = el.querySelector('#fSystemOther');
  // Prefill RequestedBy with demo user if present
  try{
    const demoUser = sessionStorage.getItem('demoUser');
    if(demoUser){ const rInp = el.querySelector('#fRequestedBy'); if(rInp) rInp.value = demoUser; }
  }catch(_e){}
  if(sysSel && sysOther){
    sysSel.addEventListener('change', ()=>{ sysOther.style.display = (sysSel.value==='Other') ? 'inline-block' : 'none'; });
  }
  return el;
}

// initial
refresh();

// Sidebar nav actions
document.querySelectorAll('.nav-link').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const act = a.getAttribute('data-action');
    if(act==='submit'){
      openModal(renderSubmitForm());
    }else if(act==='dashboard'){
      window.scrollTo({top:0,behavior:'smooth'});
    }else if(act==='reports'){
      // For prototype, focus summary cards and show a quick export hint
      const el = document.getElementById('summaryCards');
      if(el) el.scrollIntoView({behavior:'smooth'});
      // show a small transient notice
      const note = document.createElement('div'); note.className='card'; note.style.marginTop='12px'; note.innerHTML='<strong>Reports</strong><div class="meta">Use CSV export (server) — request export endpoint if needed.</div>';
      el.parentNode.insertBefore(note, el.nextSibling);
      setTimeout(()=>note.remove(),5000);
    }
  });
});
