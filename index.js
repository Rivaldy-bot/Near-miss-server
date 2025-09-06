const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low, JSONFile } = require('lowdb');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Simple lowdb for file-based persistence
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data = db.data || { reports: [] };
  await db.write();
}

initDB();

// API endpoints
app.get('/api/reports', async (req, res) => {
  await db.read();
  res.json(db.data.reports);
});

app.post('/api/reports', async (req, res) => {
  await db.read();
  const report = req.body;
  if (!report.id) report.id = Date.now().toString();
  db.data.reports.unshift(report);
  await db.write();
  res.status(201).json(report);
});

app.delete('/api/reports/:id', async (req, res) => {
  await db.read();
  const id = req.params.id;
  db.data.reports = db.data.reports.filter(r => r.id !== id);
  await db.write();
  res.status(204).send();
});

app.put('/api/reports/:id/followup', async (req, res) => {
  await db.read();
  const id = req.params.id;
  const item = db.data.reports.find(r => r.id === id);
  if (item) {
    item.tindakLanjut = !item.tindakLanjut;
    await db.write();
    res.json(item);
  } else res.status(404).json({error:'Not found'});
});

app.post('/api/reports/reset', async (req, res) => {
  db.data.reports = [];
  await db.write();
  res.json({ok:true});
});

// Serve client build if exists (optional)
const clientBuild = path.join(__dirname, 'client-build');
if (require('fs').existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req,res)=> res.sendFile(path.join(clientBuild,'index.html')));
}

app.listen(PORT, ()=> console.log('Server running on port', PORT));