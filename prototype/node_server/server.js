require('dotenv').config({ path: './config.env' });

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

// Import services
const sharePointService = require('./services/sharePointService');
const notificationService = require('./services/notificationService');
const oneDriveService = require('./services/oneDriveService');

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
app.post('/api/requests', async (req, res) => {
  try {
    const r = req.body;
    const stmt = db.prepare(`INSERT INTO requests (requestId,title,requestorName,requestorEmail,department,summary,description,changeType,priority,targetDate,documents,spiceWaxRef,status,assignedTo,reviewer,submittedDate,comments,initiator,requestedBy,dateRequested,systemName,policyFormComplete,sopTrainingComplete,briefDescription) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const requestId = r.requestId || ('REQ-' + Date.now().toString().slice(-6));
    const vals = [requestId, r.title, r.requestorName, r.requestorEmail, r.department, r.summary, r.description, r.changeType, r.priority, r.targetDate, r.documents, r.spiceWaxRef, r.status || 'Pending', r.assignedTo || '', r.reviewer || '', r.submittedDate || new Date().toISOString(), r.comments || '', r.initiator || '', r.requestedBy || r.requestorName || '', r.dateRequested || r.submittedDate || new Date().toISOString(), r.systemName || '', r.policyFormComplete?1:0, r.sopTrainingComplete?1:0, r.briefDescription || ''];

    stmt.run(vals, async function(err){
      if(err) return res.status(500).json({error:err.message});

      // Sync to SharePoint
      try {
        await sharePointService.createChangeRequest({
          title: r.title,
          requestId: requestId,
          requestorName: r.requestorName,
          requestorEmail: r.requestorEmail,
          department: r.department,
          summary: r.summary,
          description: r.description,
          changeType: r.changeType,
          priority: r.priority,
          status: r.status || 'Pending',
          submittedDate: r.submittedDate || new Date().toISOString()
        });
      } catch (spError) {
        console.error('SharePoint sync failed:', spError);
        // Continue with response even if SharePoint fails
      }

      // Send Teams notification
      try {
        await notificationService.sendTeamsNotification({
          title: r.title,
          status: r.status || 'Pending',
          priority: r.priority
        });
      } catch (teamsError) {
        console.error('Teams notification failed:', teamsError);
        // Continue with response even if notification fails
      }

      res.json({id: this.lastID, requestId});
    });
    stmt.finalize();
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({error: error.message});
  }
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
app.put('/api/requests/:requestId', async (req,res)=>{
  try {
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
    db.run(sql, values, async function(err){
      if(err) return res.status(500).json({error:err.message});

      // Sync status update to SharePoint if status changed
      if(r.status) {
        try {
          await sharePointService.updateChangeRequest(rid, { Status: r.status });
        } catch (spError) {
          console.error('SharePoint update failed:', spError);
          // Continue with response even if SharePoint fails
        }
      }

      res.json({changes:this.changes});
    });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({error: error.message});
  }
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
    // Build CSV with proper Excel table formatting
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const header = cols.map(col => `"${col}"`).join(',') + '\n'; // Quote all headers
    const escape = (v) => {
      if(v===null || v===undefined) return '""';
      const s = v.toString().replace(/"/g,'""'); // Escape quotes by doubling them
      // Quote fields that contain commas, quotes, or newlines
      if(s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s + '"';
      }
      return s;
    };
    const lines = rows.map(r => cols.map(c => escape(r[c])).join(','));
    const csv = BOM + header + lines.join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="isv-change-requests.csv"');
    res.setHeader('Cache-Control','no-cache, no-store, must-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.setHeader('X-Content-Type-Options','nosniff');
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

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API: upload document to OneDrive
app.post('/api/upload/:requestId', upload.single('file'), async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await oneDriveService.uploadDocument(file, requestId);
    res.json({ success: true, fileId: result.id, fileName: file.originalname });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: get documents for a request
app.get('/api/documents/:requestId', async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const documents = await oneDriveService.getDocuments(requestId);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Power Automate Integration Endpoints

// Webhook endpoint for Power Automate approval notifications
app.post('/api/webhooks/powerautomate/approval', async (req, res) => {
  try {
    const { requestId, outcome, approver, comments } = req.body;

    // Update request status based on approval outcome
    const status = outcome === 'Approve' ? 'Approved' : 'Rejected';

    // Update in database
    db.run(`UPDATE requests SET status=?, comments=? WHERE requestId=?`,
      [status, comments || '', requestId], async function(err) {
        if (err) {
          console.error('Database update failed:', err);
          return res.status(500).json({ error: err.message });
        }

        // Sync to SharePoint
        try {
          await sharePointService.updateChangeRequest(requestId, {
            Status: status,
            Comments: comments || ''
          });
        } catch (spError) {
          console.error('SharePoint sync failed:', spError);
        }

        // Send notification to requestor
        try {
          const request = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM requests WHERE requestId=?`, [requestId], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });

          await notificationService.sendEmailNotification({
            to: request.requestorEmail,
            subject: `Change Request ${requestId} ${status}`,
            body: `Your change request "${request.title}" has been ${status.toLowerCase()}.${comments ? `\n\nComments: ${comments}` : ''}`
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }

        res.json({ success: true, changes: this.changes });
      });
  } catch (error) {
    console.error('Approval webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Power Automate to trigger implementation status
app.post('/api/powerautomate/implement/:requestId', async (req, res) => {
  try {
    const requestId = req.params.requestId;

    // Update status to Implemented
    db.run(`UPDATE requests SET status='Implemented' WHERE requestId=?`,
      [requestId], async function(err) {
        if (err) {
          console.error('Database update failed:', err);
          return res.status(500).json({ error: err.message });
        }

        // Sync to SharePoint
        try {
          await sharePointService.updateChangeRequest(requestId, {
            Status: 'Implemented'
          });
        } catch (spError) {
          console.error('SharePoint sync failed:', spError);
        }

        res.json({ success: true, changes: this.changes });
      });
  } catch (error) {
    console.error('Implementation trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Power Apps Integration Endpoints

// Endpoint for Power Apps to submit change requests directly
app.post('/api/powerapps/submit', async (req, res) => {
  try {
    const r = req.body;

    // Create in database
    const stmt = db.prepare(`INSERT INTO requests (requestId,title,requestorName,requestorEmail,department,summary,description,changeType,priority,targetDate,documents,spiceWaxRef,status,assignedTo,reviewer,submittedDate,comments,initiator,requestedBy,dateRequested,systemName,policyFormComplete,sopTrainingComplete,briefDescription) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const requestId = r.requestId || ('REQ-' + Date.now().toString().slice(-6));
    const vals = [requestId, r.title, r.requestorName, r.requestorEmail, r.department, r.summary, r.description, r.changeType, r.priority, r.targetDate, r.documents, r.spiceWaxRef, r.status || 'Pending', r.assignedTo || '', r.reviewer || '', r.submittedDate || new Date().toISOString(), r.comments || '', r.initiator || '', r.requestedBy || r.requestorName || '', r.dateRequested || r.submittedDate || new Date().toISOString(), r.systemName || '', r.policyFormComplete?1:0, r.sopTrainingComplete?1:0, r.briefDescription || ''];

    stmt.run(vals, async function(err){
      if(err) return res.status(500).json({error:err.message});

      // Sync to SharePoint
      try {
        await sharePointService.createChangeRequest({
          title: r.title,
          requestId: requestId,
          requestorName: r.requestorName,
          requestorEmail: r.requestorEmail,
          department: r.department,
          summary: r.summary,
          description: r.description,
          changeType: r.changeType,
          priority: r.priority,
          status: r.status || 'Pending',
          submittedDate: r.submittedDate || new Date().toISOString()
        });
      } catch (spError) {
        console.error('SharePoint sync failed:', spError);
      }

      // Send Teams notification
      try {
        await notificationService.sendTeamsNotification({
          title: r.title,
          status: r.status || 'Pending',
          priority: r.priority
        });
      } catch (teamsError) {
        console.error('Teams notification failed:', teamsError);
      }

      res.json({id: this.lastID, requestId});
    });
    stmt.finalize();
  } catch (error) {
    console.error('Power Apps submit error:', error);
    res.status(500).json({error: error.message});
  }
});

// Endpoint for Power Apps to get form data/options
app.get('/api/powerapps/formdata', (req, res) => {
  const formData = {
    departments: ["Information Systems","Validation","Human Resources","Finance","Regulatory Affairs","Procurement","Operational Health and Safety","Commercial","Quality Assurance","Quality Control","Production","Engineering","Research and Development","Analytical Development","Supply Chain","Other"],
    changeTypes: ["Bug Fix","Enhancement","Config Change","Hotfix","Other"],
    priorities: ["Low","Medium","High","Critical"],
    systems: ["Core System","Validation System","QA System","Other"]
  };
  res.json(formData);
});

// Endpoint for Power Apps to upload attachments
app.post('/api/powerapps/upload/:requestId', upload.single('file'), async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await oneDriveService.uploadDocument(file, requestId);
    res.json({ success: true, fileId: result.id, fileName: file.originalname });
  } catch (error) {
    console.error('Power Apps upload failed:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server started on http://localhost:'+PORT));
