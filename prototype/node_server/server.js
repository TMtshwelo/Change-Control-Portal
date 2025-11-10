const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'requests.db');
const staticDir = path.join(__dirname, 'node_demo');
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ensure db exists
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId TEXT,
    title TEXT,
    requestorName TEXT,
    requestorEmail TEXT,
    department TEXT,
    summary TEXT,
    description TEXT,
    changeType TEXT,
    priority TEXT,
    targetDate TEXT,
    documents TEXT,
    spiceWaxRef TEXT,
    status TEXT,
    assignedTo TEXT,
    reviewer TEXT,
    submittedDate TEXT,
    comments TEXT
  )`);
  // Ensure new columns exist for extended metadata (backfill-safe)
  db.all(`PRAGMA table_info(requests)`, (err, cols)=>{
    if(err) return console.error('PRAGMA failed', err);
    const existing = (cols||[]).map(c=>c.name);
    const additions = [
        {name:'initiator', type:'TEXT'},
        {name:'requestedBy', type:'TEXT'},
      {name:'dateRequested', type:'TEXT'},
      {name:'systemName', type:'TEXT'},
      {name:'policyFormComplete', type:'INTEGER'},
      {name:'sopTrainingComplete', type:'INTEGER'},
      {name:'briefDescription', type:'TEXT'}
    ];
    additions.forEach(a=>{
      if(!existing.includes(a.name)){
        const sql = `ALTER TABLE requests ADD COLUMN ${a.name} ${a.type}`;
        db.run(sql, (e)=>{ if(e) console.error('ALTER add column failed', a.name, e); else console.log('Added column', a.name); });
      }
    });
  });
});

// Serve the static demo client with welcome.html as the default index
app.use('/', express.static(staticDir, { index: 'welcome.html' }));

// API: create request
app.post('/api/requests', (req, res) => {
  const r = req.body;
  const stmt = db.prepare(`INSERT INTO requests (requestId,title,requestorName,requestorEmail,department,summary,description,changeType,priority,targetDate,documents,spiceWaxRef,status,assignedTo,reviewer,submittedDate,comments,initiator,requestedBy,dateRequested,systemName,policyFormComplete,sopTrainingComplete,briefDescription) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const requestId = r.requestId || ('REQ-' + Date.now().toString().slice(-6));
  const vals = [requestId, r.title, r.requestorName, r.requestorEmail, r.department, r.summary, r.description, r.changeType, r.priority, r.targetDate, r.documents, r.spiceWaxRef, r.status || 'Pending', r.assignedTo || '', r.reviewer || '', r.submittedDate || new Date().toISOString(), r.comments || '', r.initiator || '', r.requestedBy || r.requestorName || '', r.dateRequested || r.submittedDate || new Date().toISOString(), r.systemName || '', r.policyFormComplete?1:0, r.sopTrainingComplete?1:0, r.briefDescription || ''];
  stmt.run(vals, function(err){
    if(err) return res.status(500).json({error:err.message});
    res.json({id: this.lastID, requestId});
  });
  stmt.finalize();
});

// API: list requests
app.get('/api/requests', (req, res) => {
  // support basic filtering by status/department/date for charts/reporting
  const filters = [];
  const params = [];
  if(req.query.status){ filters.push('status = ?'); params.push(req.query.status); }
  if(req.query.requestedBy){ filters.push('requestedBy = ?'); params.push(req.query.requestedBy); }
  if(req.query.department){ filters.push('department = ?'); params.push(req.query.department); }
  if(req.query.from){ filters.push("date(submittedDate) >= date(?)"); params.push(req.query.from); }
  if(req.query.to){ filters.push("date(submittedDate) <= date(?)"); params.push(req.query.to); }
  const where = filters.length ? ('WHERE ' + filters.join(' AND ')) : '';
  const sql = `SELECT * FROM requests ${where} ORDER BY id DESC`;
  db.all(sql, params, (err, rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});

// API: update request by requestId
app.put('/api/requests/:requestId', (req,res)=>{
  const rid = req.params.requestId;
  const r = req.body;
  const fields = [];
  const values = [];
  for(const k of ['status','assignedTo','comments','reviewer','initiator','requestedBy','dateRequested','systemName','policyFormComplete','sopTrainingComplete']){
    if(r[k]!==undefined){ fields.push(`${k}=?`); values.push(r[k]); }
  }
  if(fields.length===0) return res.status(400).json({error:'no updatable fields'});
  values.push(rid);
  const sql = `UPDATE requests SET ${fields.join(', ')} WHERE requestId=?`;
  db.run(sql, values, function(err){ if(err) return res.status(500).json({error:err.message}); res.json({changes:this.changes}); });
});

// API: export requests as CSV for audit
app.get('/api/export', (req, res) => {
  const cols = ['requestId','title','requestorName','requestorEmail','department','status','priority','submittedDate','dateRequested','requestedBy','initiator','targetDate','assignedTo','documents','spiceWaxRef','policyFormComplete','sopTrainingComplete','briefDescription','description','changeType','reviewer','systemName'];

  // Support optional filters via query params: status, department, from, to
  const filters = [];
  const params = [];
  if(req.query.status){ filters.push("status = ?"); params.push(req.query.status); }
  if(req.query.department){ filters.push("department = ?"); params.push(req.query.department); }
  if(req.query.from){ filters.push("date(submittedDate) >= date(?)"); params.push(req.query.from); }
  if(req.query.to){ filters.push("date(submittedDate) <= date(?)"); params.push(req.query.to); }

  const where = filters.length ? ('WHERE ' + filters.join(' AND ')) : '';
  const sql = `SELECT ${cols.join(',')} FROM requests ${where} ORDER BY id DESC`;
  db.all(sql, params, (err, rows)=>{
    if(err) return res.status(500).json({error:err.message});
    // Build CSV
    const header = cols.join(',') + '\n';
    const escape = (v) => {
      if(v===null || v===undefined) return '';
      const s = v.toString().replace(/"/g,'""');
      return '"' + s + '"';
    };
    const lines = rows.map(r => cols.map(c => escape(r[c])).join(','));
    const csv = header + lines.join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="isv-change-requests.csv"');
    res.send(csv);
  });
});

// API: show DB schema (for demo / troubleshooting)
app.get('/api/schema', (req, res) => {
  db.all(`PRAGMA table_info(requests)`, (err, rows)=>{
    if(err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server started on http://localhost:'+PORT));
