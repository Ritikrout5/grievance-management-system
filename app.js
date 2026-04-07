/* ══════════════════════════════════════════════
   DRIEMS University — Grievance Management System
   app.js
   ══════════════════════════════════════════════ */

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
console.log(window.db)
let grievances = [];
let currentUser = null;
let currentGID = null;
let lastGID = '';
let currentPrio = 'low';
let uploadedFiles = [];
let staffUploadedFiles = [];
let currentRating = 0;
let activePanel = '';
let adminSearch = '';
let adminStatusF = '';
let adminPrioF = '';
let sListFilter = '';
let sListStatusFilter = '';

// ══════════════════════════════════════════
//  DEMO DATA
// ══════════════════════════════════════════
const DEMO = [
  {
    id: 'GRV-2024-001', name: 'Rahul Kumar', roll: '21CS001',
    dept: 'Computer Science & Engineering', cat: 'Academic / Examination',
    sub: 'Semester 5 result not published',
    desc: 'My semester 5 result has not been published yet on the portal even after 3 weeks.',
    prio: 'high', date: '15/01/2024', status: 'In Progress',
    assigned: 'Computer Science & Engineering',
    response: 'We have escalated this to the examination cell. Result will be published within 3 working days.',
    responseBy: 'Admin — 17/01/2024', rating: 0
  },
  {
    id: 'GRV-2024-002', name: 'Priya Singh', roll: '21EC045',
    dept: 'Electronics & Communication', cat: 'Infrastructure / Facilities',
    sub: 'Lab equipment not working',
    desc: 'Several oscilloscopes and function generators in ECE Lab 2 are non-functional.',
    prio: 'med', date: '18/01/2024', status: 'Resolved',
    assigned: 'Electronics & Communication',
    response: 'All faulty equipment has been replaced. New instruments are installed.',
    responseBy: 'ECE Dept Staff — 22/01/2024', rating: 5
  },
  {
    id: 'GRV-2024-003', name: 'Amit Das', roll: '21ME012',
    dept: 'Mechanical Engineering', cat: 'Hostel / Accommodation',
    sub: 'Water supply disruption in Block C',
    desc: 'No water supply in hostel Block C for 2 days.',
    prio: 'high', date: '20/01/2024', status: 'Submitted',
    assigned: '', response: '', responseBy: '', rating: 0
  }
];

// function loadDemo() { grievances = JSON.parse(JSON.stringify(DEMO)); }
// loadDemo();

// ══════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════
function pad(n) { return String(n).padStart(2, '0'); }

function today() {
  const d = new Date();
  return `${d.getDate()}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function genGID() {
  return 'GRV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function toast(msg, type = 'i') {
  const t = document.getElementById('toast');
  t.className = 'toast ' + type;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openModal(id) { document.getElementById(id).classList.add('open'); }

function badgeClass(s) {
  const m = { 'Submitted': 'b-sub', 'Under Review': 'b-review', 'In Progress': 'b-prog', 'Resolved': 'b-res', 'Rejected': 'b-rej' };
  return m[s] || 'b-sub';
}

function prioBadge(p) {
  const cls = { low: 'b-low', med: 'b-med', high: 'b-high' };
  const label = { low: '🟢 Low', med: '🟡 Medium', high: '🔴 High' };
  return `<span class="badge ${cls[p] || 'b-sub'}">${label[p] || p}</span>`;
}

// ══════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════
function switchAuthTab(t) {
  document.getElementById('tab-l').classList.toggle('on', t === 'login');
  document.getElementById('tab-r').classList.toggle('on', t === 'register');
  document.getElementById('form-login').style.display = t === 'login' ? 'block' : 'none';
  document.getElementById('form-reg').style.display = t === 'register' ? 'block' : 'none';
}

function doLogin() {
  const role = document.getElementById('l-role').value;
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  if (!role) { toast('Please select your role', 'e'); return; }
  if (!email || !pass) { toast('Enter your credentials', 'e'); return; }
  const name = email.split('@')[0] || 'User';
  currentUser = { name, role, email, dept: 'Computer Science & Engineering' };
  localStorage.setItem("role", role);
  setupApp(role, name, email);
  goDashboard()
}

function doRegister() {
  const fn = document.getElementById('r-fn').value.trim();
  const ln = document.getElementById('r-ln').value.trim();
  const email = document.getElementById('r-email').value.trim();
  if (!fn || !ln || !email) { toast('Fill in all required fields', 'e'); return; }
  toast('Account created! Please sign in.', 's');
  switchAuthTab('login');
}

function setupApp(role, name, email) {
  document.getElementById('nav-public').style.display = 'none';
  document.getElementById('nav-app').style.display = 'flex';
  document.getElementById('nav-role-label').textContent =
    role === 'admin' ? '⚙️ Admin' : role === 'staff' ? '🏢 Staff' : '🎓 Student';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'student';
  document.getElementById('pg-' + pg).classList.add('active');

  if (role === 'student') {
    document.getElementById('s-username').textContent = name;
    document.getElementById('s-date').textContent = new Date().toDateString() + ' — DRIEMS University';
    loadGrievancesFromDB();
    updateStudentStats();
    renderSList();
  } else if (role === 'admin') {
    updateAdminStats();
    renderAdminAll();
    renderUnassigned();
    renderAdminCharts();
  } else {
    document.getElementById('st-dept-label').textContent = 'Department: Computer Science & Engineering';
    updateStaffStats();
    renderStaffList();
    populateStaffSelect();
  }

  // Profile setup
  document.getElementById('pf-av').textContent = name[0].toUpperCase();
  document.getElementById('pf-name').textContent = name;
  document.getElementById('pf-email').textContent = email;
  document.getElementById('pf-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
  document.getElementById('pf-dept').textContent = 'DRIEMS University';
  document.getElementById('pf-name-input').value = name;

  toast('Welcome, ' + name + '! 🎓', 's');
}

function doLogout() {
  currentUser = null;
  document.getElementById('nav-public').style.display = 'flex';
  document.getElementById('nav-app').style.display = 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg-home').classList.add('active');
  loadDemo();
  toast('Signed out successfully.', 'i');
}

function goHome() {
  if (!currentUser) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('pg-home').classList.add('active');
  }
}

// ══════════════════════════════════════════
//  PANEL SYSTEM
// ══════════════════════════════════════════
function showPanel(id) {
  const role = currentUser?.role || 'student';
  const pg = role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'student';

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.slink').forEach(l => l.classList.remove('on'));

  if (id === 'profile') {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('pg-profile').classList.add('active');
  } else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('pg-' + pg).classList.add('active');
    const panel = document.getElementById('panel-' + id);
    if (panel) { panel.classList.add('on'); panel.classList.add('fade-in'); }
    const sl = document.getElementById('sl-' + id);
    if (sl) sl.classList.add('on');
  }

  activePanel = id;

  // Refresh data on panel switch
  if (id === 's-home') updateStudentStats();
  if (id === 's-list') renderSList();
  if (id === 's-feedback') renderFeedbacks();
  if (id === 'a-home') { updateAdminStats(); renderAdminCharts(); }
  if (id === 'a-all') renderAdminAll();
  if (id === 'a-assign') renderUnassigned();
  if (id === 'a-reports') renderReports();
  if (id === 'st-home') updateStaffStats();
  if (id === 'st-assigned') renderStaffList();
  if (id === 'st-respond') populateStaffSelect();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════
//  PRIORITY SELECTOR
// ══════════════════════════════════════════
function setPrio(p, el) {
  currentPrio = p;
  document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
}

// ══════════════════════════════════════════
//  FILE UPLOADS
// ══════════════════════════════════════════
function handleFiles(files) {
  uploadedFiles = [...files];
  renderFilePreview('file-preview', uploadedFiles);
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-area').classList.remove('drag');
  handleFiles(e.dataTransfer.files);
}

function handleStaffFiles(files) {
  staffUploadedFiles = [...files];
  renderFilePreview('staff-file-preview', staffUploadedFiles);
}

function renderFilePreview(containerId, files) {
  const fp = document.getElementById(containerId);
  fp.innerHTML = '';
  files.forEach((f, i) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.innerHTML = `📄 ${f.name} <button onclick="removeFile(${i},'${containerId}')">×</button>`;
    fp.appendChild(chip);
  });
}

function removeFile(i, cid) {
  if (cid === 'file-preview') { uploadedFiles.splice(i, 1); renderFilePreview(cid, uploadedFiles); }
  else { staffUploadedFiles.splice(i, 1); renderFilePreview(cid, staffUploadedFiles); }
}

// ══════════════════════════════════════════
//  SUBMIT GRIEVANCE (Student)
// ══════════════════════════════════════════
// function submitGrievance() {
//   const name = document.getElementById('g-name').value.trim();
//   const roll = document.getElementById('g-roll').value.trim();
//   const dept = document.getElementById('g-dept').value;
//   const cat  = document.getElementById('g-cat').value;
//   const sub  = document.getElementById('g-sub').value.trim();
//   const desc = document.getElementById('g-desc').value.trim();

//   if (!name || !roll || !dept || !cat || !sub || !desc) {
//     toast('Please fill in all required fields.', 'e');
//     return;
//   }

//   const gid = genGID();
//   lastGID = gid;

async function submitGrievance() {
  const name = document.getElementById('g-name').value.trim();
  const roll = document.getElementById('g-roll').value.trim();
  const dept = document.getElementById('g-dept').value;
  const cat = document.getElementById('g-cat').value;
  const sub = document.getElementById('g-sub').value.trim();
  const desc = document.getElementById('g-desc').value.trim();

  if (!name || !roll || !dept || !cat || !sub || !desc) {
    toast('Please fill in all required fields.', 'e');
    return;
  }

  const gid = genGID();

  try {
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js");

    await setDoc(doc(window.db, "grievances", gid), {
      id: gid,
      name,
      roll,
      dept,
      cat,
      sub,
      desc,
      prio: currentPrio,
      date: today(),
      status: "Submitted"
    });

    currentGID = gid;
    lastGID = gid;


    document.getElementById('success-gid').textContent = gid;
    openModal('modal-success');

    await loadGrievancesFromDB();

    toast("Grievance submitted successfully ✅", "s");

  } catch (error) {
    console.error(error);
    toast("Error saving data ❌", "e");
  }
}

async function loadGrievancesFromDB() {
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js");

    const querySnapshot = await getDocs(collection(window.db, "grievances"));

    grievances = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.id) {   // 🔥 IMPORTANT CHECK
        grievances.push(data);
      }
    });

    console.log("🔥 Loaded grievances:", grievances);

  } catch (err) {
    console.error("❌ Load error:", err);
  }
}

// Reset form
uploadedFiles = []; {
  document.getElementById('file-preview').innerHTML = '';
  ['g-name', 'g-roll', 'g-sub', 'g-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('g-dept').selectedIndex = 0;
  document.getElementById('g-cat').selectedIndex = 0;

  document.getElementById('success-gid').textContent = gid;
  openModal('modal-success');
  updateStudentStats();
}


// ══════════════════════════════════════════
//  STUDENT — STATS & LISTS
// ══════════════════════════════════════════
function myGrievances() { return grievances; }

function updateStudentStats() {
  const gs = myGrievances();
  set('ss-total', gs.length);
  set('ss-pend', gs.filter(g => g.status === 'Submitted').length);
  set('ss-prog', gs.filter(g => g.status === 'In Progress' || g.status === 'Under Review').length);
  set('ss-res', gs.filter(g => g.status === 'Resolved').length);
  set('s-badge', gs.length);
  renderRecentActivity();
}

function renderRecentActivity() {
  const el = document.getElementById('s-recent-list');
  const recent = [...myGrievances()].reverse().slice(0, 4);
  if (!recent.length) { el.innerHTML = '<div class="empty" style="padding:1rem">No activity yet.</div>'; return; }
  el.innerHTML = recent.map(g => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:.83rem;font-weight:600;color:var(--navy)">${g.sub}</div>
        <div style="font-size:.72rem;color:var(--muted)">${g.id} • ${g.date}</div>
      </div>
      <span class="badge ${badgeClass(g.status)}">${g.status}</span>
    </div>`).join('');
}

function renderSList() {
  const tbody = document.getElementById('s-list-tbody');
  let gs = myGrievances();
  if (sListFilter) gs = gs.filter(g => g.sub.toLowerCase().includes(sListFilter) || g.id.toLowerCase().includes(sListFilter));
  if (sListStatusFilter) gs = gs.filter(g => g.status === sListStatusFilter);
  if (!gs.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No grievances found.</td></tr>'; return; }
  tbody.innerHTML = gs.map(g => `
    <tr>
      <td style="font-weight:700;color:var(--cobalt);font-size:.8rem">${g.id}</td>
      <td style="font-weight:500">${g.sub}</td>
      <td>${g.cat}</td>
      <td>${prioBadge(g.prio)}</td>
      <td>${g.date}</td>
      <td><span class="badge ${badgeClass(g.status)}">${g.status}</span></td>
      <td><button class="abtn primary" onclick="openDetail('${g.id}','student')">View</button></td>
    </tr>`).join('');
}

function filterSList(v) { sListFilter = v.toLowerCase(); renderSList(); }
function filterSListStatus(v) { sListStatusFilter = v; renderSList(); }

// ══════════════════════════════════════════
//  TRACK GRIEVANCE
// ══════════════════════════════════════════
const TL_STEPS = [
  { l: 'Submitted', d: 'Grievance received by portal' },
  { l: 'Under Review', d: 'Assigned to concerned department' },
  { l: 'In Progress', d: 'Active action being taken' },
  { l: 'Response Sent', d: 'Reply communicated to you' },
  { l: 'Resolved', d: 'Issue closed successfully' }
];
const TL_IDX = { 'Submitted': 0, 'Under Review': 1, 'In Progress': 2, 'Resolved': 4, 'Rejected': 4 };

async function trackGrievance() {
  const tid = document.getElementById('track-id-input').value.trim().toUpperCase();

  if (!tid) {
    toast('Enter a Grievance ID', 'e');
    return;
  }

  try {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js");

    const q = query(
      collection(window.db, "grievances"),
      where("id", "==", tid)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      toast('No grievance found ❌', 'e');
      return;
    }

    let data;
    querySnapshot.forEach((doc) => {
      data = doc.data();
    });

    renderTrackResult(data, 'tr');
    document.getElementById('track-result').style.display = 'block';

  } catch (err) {
    console.error(err);
    toast('Error fetching data ❌', 'e');
  }
}
function renderTrackResult(g, prefix) {
  const step = TL_IDX[g.status] ?? 0;
  document.getElementById(prefix + '-gid').textContent = g.id;
  document.getElementById(prefix + '-sub').textContent = g.sub;
  document.getElementById(prefix + '-cat').textContent = g.cat;
  document.getElementById(prefix + '-date').textContent = g.date;
  document.getElementById(prefix + '-prio').textContent = { low: '🟢 Low', med: '🟡 Medium', high: '🔴 High' }[g.prio] || g.prio;
  const badge = document.getElementById(prefix + '-badge');
  badge.className = 'badge ' + badgeClass(g.status);
  badge.textContent = g.status;

  const tl = document.getElementById(prefix + '-timeline');
  tl.innerHTML = '';
  TL_STEPS.forEach((s, i) => {
    const done = i < step, curr = i === step;
    tl.innerHTML += `
      <div class="tl-item">
        <div class="tl-dot ${done ? 'done' : curr ? 'curr' : 'pend'}">${done ? '✓' : curr ? '◉' : i + 1}</div>
        <div class="tl-body">
          <h5 style="color:${done || curr ? 'var(--navy)' : 'var(--muted)'}">${s.l}</h5>
          <p>${s.d}</p>
        </div>
      </div>
      ${i < TL_STEPS.length - 1 ? '<div class="tl-conn"></div>' : ''}`;
  });

  if (prefix === 'tr') {
    const rw = document.getElementById('tr-response-wrap');
    if (g.response) {
      rw.style.display = 'block';
      document.getElementById('tr-response-text').textContent = g.response;
      document.getElementById('tr-response-by').textContent = g.responseBy;
    } else {
      rw.style.display = 'none';
    }
  }
}

// ══════════════════════════════════════════
//  QUICK TRACK (Public)
// ══════════════════════════════════════════
function openQuickTrack() { openModal('modal-quicktrack'); }

function quickTrackSubmit() {
  const tid = document.getElementById('qt-input').value.trim().toUpperCase();
  if (!tid) { toast('Enter a Grievance ID', 'e'); return; }
  const g = grievances.find(x => x.id.toUpperCase() === tid);
  if (!g) { toast('No grievance found', 'e'); return; }

  document.getElementById('qt-gid').textContent = g.id;
  document.getElementById('qt-sub').textContent = g.sub;
  const b = document.getElementById('qt-badge');
  b.className = 'badge ' + badgeClass(g.status);
  b.textContent = g.status;

  const step = TL_IDX[g.status] ?? 0;
  const tl = document.getElementById('qt-timeline');
  tl.innerHTML = '';
  TL_STEPS.forEach((s, i) => {
    const done = i < step, curr = i === step;
    tl.innerHTML += `
      <div class="tl-item">
        <div class="tl-dot ${done ? 'done' : curr ? 'curr' : 'pend'}">${done ? '✓' : curr ? '◉' : i + 1}</div>
        <div class="tl-body"><h5>${s.l}</h5><p>${s.d}</p></div>
      </div>
      ${i < TL_STEPS.length - 1 ? '<div class="tl-conn"></div>' : ''}`;
  });
  document.getElementById('qt-result').style.display = 'block';
}

// ══════════════════════════════════════════
//  DETAIL MODAL
// ══════════════════════════════════════════
function openDetail(gid, viewer) {
  const g = grievances.find(x => x.id === gid);
  if (!g) return;
  currentGID = gid;

  document.getElementById('md-sub').textContent = g.sub;
  document.getElementById('md-gid').textContent = g.id + ' • ' + g.date;
  document.getElementById('md-name').textContent = g.name;
  document.getElementById('md-roll').textContent = g.roll;
  document.getElementById('md-dept').textContent = g.dept;
  document.getElementById('md-cat').textContent = g.cat;
  document.getElementById('md-prio').innerHTML = prioBadge(g.prio);
  document.getElementById('md-status').innerHTML = `<span class="badge ${badgeClass(g.status)}">${g.status}</span>`;
  document.getElementById('md-desc').textContent = g.desc;

  const fw = document.getElementById('md-files-wrap');
  if (g.files && g.files.length) {
    fw.style.display = 'block';
    document.getElementById('md-files').innerHTML = g.files.map(f => `<div class="file-chip">📄 ${f}</div>`).join('');
  } else { fw.style.display = 'none'; }

  const rw = document.getElementById('md-response-wrap');
  if (g.response) {
    rw.style.display = 'block';
    document.getElementById('md-response').textContent = g.response;
    document.getElementById('md-response-by').textContent = g.responseBy;
  } else { rw.style.display = 'none'; }

  // Admin actions panel
  const aa = document.getElementById('md-admin-actions');
  aa.style.display = viewer === 'admin' ? 'block' : 'none';
  if (viewer === 'admin') {
    document.getElementById('md-status-select').value = g.status;
    document.getElementById('md-prio-select').value = g.prio;
    document.getElementById('md-admin-note').value = g.response || '';
  }

  // Reopen option (student, resolved)
  document.getElementById('md-reopen-wrap').style.display =
    (viewer === 'student' && g.status === 'Resolved') ? 'block' : 'none';

  // Feedback (student, resolved, not yet rated)
  document.getElementById('md-feedback-wrap').style.display =
    (viewer === 'student' && g.status === 'Resolved' && !g.rating) ? 'block' : 'none';
  if (g.rating) setRating(g.rating);

  openModal('modal-detail');
}

function adminUpdateGrievance() {
  if (!currentGID) return;
  const g = grievances.find(x => x.id === currentGID);
  if (!g) return;
  g.status = document.getElementById('md-status-select').value;
  g.prio = document.getElementById('md-prio-select').value;
  g.assigned = document.getElementById('md-assign-dept').value;
  const note = document.getElementById('md-admin-note').value.trim();
  if (note) { g.response = note; g.responseBy = 'Admin — ' + today(); }
  closeModal('modal-detail');
  renderAdminAll(); renderUnassigned(); updateAdminStats(); renderAdminCharts();
  toast('Grievance updated successfully!', 's');
}

function reopenGrievance() {
  const g = grievances.find(x => x.id === currentGID);
  if (!g) return;
  g.status = 'Submitted'; g.response = ''; g.responseBy = '';
  closeModal('modal-detail');
  toast('Grievance reopened. Authorities have been notified.', 'i');
  updateStudentStats(); renderSList();
}

// ══════════════════════════════════════════
//  FEEDBACK & RATINGS
// ══════════════════════════════════════════
function setRating(n) {
  currentRating = n;
  document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < n));
}

function submitFeedback() {
  const g = grievances.find(x => x.id === currentGID);
  if (!g) return;
  g.rating = currentRating;
  g.feedbackText = document.getElementById('feedback-text').value;
  closeModal('modal-detail');
  toast(currentRating > 0 ? '⭐ Thank you for your feedback!' : 'Feedback submitted!', 's');
  renderFeedbacks();
}

function renderFeedbacks() {
  const resolved = myGrievances().filter(g => g.status === 'Resolved');
  const el = document.getElementById('feedback-list');
  if (!resolved.length) { el.innerHTML = '<div class="empty">No resolved grievances to rate yet.</div>'; return; }
  el.innerHTML = resolved.map(g => `
    <div class="card card-pad" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
        <div>
          <div style="font-weight:700;color:var(--navy)">${g.sub}</div>
          <div style="font-size:.75rem;color:var(--muted)">${g.id} • Resolved</div>
        </div>
        <div>${g.rating
      ? '⭐'.repeat(g.rating)
      : `<button class="abtn primary" onclick="openDetail('${g.id}','student')">Rate</button>`}</div>
      </div>
      ${g.response ? `<div class="response-box"><p>${g.response}</p><small>${g.responseBy}</small></div>` : ''}
      ${g.feedbackText ? `<div style="font-size:.8rem;color:var(--muted);margin-top:.5rem;font-style:italic">"${g.feedbackText}"</div>` : ''}
    </div>`).join('');
}

// ══════════════════════════════════════════
//  ADMIN — STATS, LISTS, CHARTS
// ══════════════════════════════════════════
function updateAdminStats() {
  set('as-total', grievances.length);
  set('as-pend', grievances.filter(g => g.status === 'Submitted').length);
  set('as-prog', grievances.filter(g => g.status === 'In Progress' || g.status === 'Under Review').length);
  set('as-res', grievances.filter(g => g.status === 'Resolved').length);
  set('a-badge', grievances.length);

  const rtb = document.getElementById('a-recent-tbody');
  if (rtb) {
    rtb.innerHTML = [...grievances].reverse().slice(0, 5).map(g => `
      <tr>
        <td style="font-weight:700;color:var(--cobalt);font-size:.78rem">${g.id}</td>
        <td>${g.sub}</td><td>${g.cat}</td>
        <td>${prioBadge(g.prio)}</td>
        <td><span class="badge ${badgeClass(g.status)}">${g.status}</span></td>
      </tr>`).join('');
  }
}

function renderAdminAll() {
  let gs = [...grievances];
  if (adminSearch) gs = gs.filter(g => g.sub.toLowerCase().includes(adminSearch) || g.id.toLowerCase().includes(adminSearch) || g.name.toLowerCase().includes(adminSearch));
  if (adminStatusF) gs = gs.filter(g => g.status === adminStatusF);
  if (adminPrioF) gs = gs.filter(g => g.prio === adminPrioF);

  const tb = document.getElementById('a-all-tbody');
  if (!gs.length) { tb.innerHTML = '<tr><td colspan="8" class="empty">No grievances found.</td></tr>'; return; }
  tb.innerHTML = gs.map(g => `
    <tr>
      <td style="font-weight:700;color:var(--cobalt);font-size:.78rem">${g.id}</td>
      <td>${g.name}</td>
      <td style="font-size:.8rem">${g.dept}</td>
      <td>${g.sub}</td>
      <td>${prioBadge(g.prio)}</td>
      <td>${g.date}</td>
      <td><span class="badge ${badgeClass(g.status)}">${g.status}</span></td>
      <td><button class="abtn primary" onclick="openDetail('${g.id}','admin')">Manage</button></td>
    </tr>`).join('');
}

function filterAdmin(v) { adminSearch = v.toLowerCase(); renderAdminAll(); }
function filterAdminStatus(v) { adminStatusF = v; renderAdminAll(); }
function filterAdminPrio(v) { adminPrioF = v; renderAdminAll(); }

function renderUnassigned() {
  const unassigned = grievances.filter(g => !g.assigned);
  const el = document.getElementById('unassigned-list');
  if (!unassigned.length) { el.innerHTML = '<div class="empty">All grievances have been assigned. ✅</div>'; return; }
  el.innerHTML = unassigned.map(g => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.9rem;border:1.5px solid var(--border);border-radius:10px;margin-bottom:.7rem;background:var(--bg)">
      <div>
        <div style="font-weight:700;color:var(--navy);font-size:.9rem">${g.sub}</div>
        <div style="font-size:.75rem;color:var(--muted)">${g.id} • ${g.name} • ${g.prio} priority</div>
      </div>
      <button class="abtn primary" onclick="openDetail('${g.id}','admin')">Assign →</button>
    </div>`).join('');
}

function renderAdminCharts() {
  // Department chart
  const depts = {};
  grievances.forEach(g => { depts[g.dept] = (depts[g.dept] || 0) + 1; });
  const maxD = Math.max(...Object.values(depts), 1);
  const dcEl = document.getElementById('dept-chart');
  if (dcEl) dcEl.innerHTML = '<div class="bar-chart">' +
    Object.entries(depts).slice(0, 5).map(([d, n]) => `
      <div class="bar-row">
        <div class="bar-label" title="${d}">${d.split('&')[0].trim().substring(0, 18)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${n / maxD * 100}%"></div></div>
        <div class="bar-val">${n}</div>
      </div>`).join('') + '</div>';

  // Priority chart
  const pc = document.getElementById('prio-chart');
  const prios = { low: 0, med: 0, high: 0 };
  grievances.forEach(g => prios[g.prio] = (prios[g.prio] || 0) + 1);
  const mp = Math.max(...Object.values(prios), 1);
  if (pc) pc.innerHTML = '<div class="bar-chart">' +
    [['low', '🟢 Low'], ['med', '🟡 Medium'], ['high', '🔴 High']].map(([k, l]) => `
      <div class="bar-row"><div class="bar-label">${l}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${prios[k] / mp * 100}%;background:${k === 'high' ? 'linear-gradient(90deg,var(--error),#f87171)'
        : k === 'med' ? 'linear-gradient(90deg,var(--warn),#fbbf24)'
          : 'linear-gradient(90deg,var(--success),#4ade80)'}"></div></div>
        <div class="bar-val">${prios[k]}</div></div>`).join('') + '</div>';

  // Status chart
  const sc2 = document.getElementById('status-chart');
  const statuses = { 'Submitted': 0, 'Under Review': 0, 'In Progress': 0, 'Resolved': 0, 'Rejected': 0 };
  grievances.forEach(g => statuses[g.status] = (statuses[g.status] || 0) + 1);
  const ms = Math.max(...Object.values(statuses), 1);
  if (sc2) sc2.innerHTML = '<div class="bar-chart">' +
    Object.entries(statuses).map(([s, n]) => `
      <div class="bar-row"><div class="bar-label">${s}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${n / ms * 100}%"></div></div>
        <div class="bar-val">${n}</div></div>`).join('') + '</div>';
}

function renderReports() {
  renderAdminCharts();

  // Monthly summary
  const mr = document.getElementById('monthly-report');
  if (mr) mr.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
      <div style="background:var(--bg);border-radius:10px;padding:1rem;text-align:center">
        <div style="font-family:'Crimson Pro',serif;font-size:2rem;font-weight:700;color:var(--navy)">${grievances.length}</div>
        <div style="font-size:.75rem;color:var(--muted)">Total This Month</div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:1rem;text-align:center">
        <div style="font-family:'Crimson Pro',serif;font-size:2rem;font-weight:700;color:var(--success)">${grievances.filter(g => g.status === 'Resolved').length}</div>
        <div style="font-size:.75rem;color:var(--muted)">Resolved</div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:1rem;text-align:center">
        <div style="font-family:'Crimson Pro',serif;font-size:2rem;font-weight:700;color:var(--error)">${grievances.filter(g => g.status === 'Submitted').length}</div>
        <div style="font-size:.75rem;color:var(--muted)">Pending</div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:1rem;text-align:center">
        <div style="font-family:'Crimson Pro',serif;font-size:2rem;font-weight:700;color:var(--cobalt)">${grievances.length ? Math.round(grievances.filter(g => g.status === 'Resolved').length / grievances.length * 100) : 0}%</div>
        <div style="font-size:.75rem;color:var(--muted)">Resolution Rate</div>
      </div>
    </div>`;

  // Department performance
  const dp = document.getElementById('dept-perf');
  const dMap = {};
  grievances.forEach(g => {
    if (!dMap[g.dept]) dMap[g.dept] = { total: 0, resolved: 0 };
    dMap[g.dept].total++;
    if (g.status === 'Resolved') dMap[g.dept].resolved++;
  });
  if (dp) dp.innerHTML = Object.entries(dMap).map(([d, v]) => `
    <div style="margin-bottom:.9rem">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;font-weight:600;margin-bottom:.3rem">
        <span style="color:var(--navy)">${d.split('&')[0].trim()}</span>
        <span style="color:var(--muted)">${v.resolved}/${v.total}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${v.total ? v.resolved / v.total * 100 : 0}%"></div></div>
    </div>`).join('') || '<div class="text-muted">No data yet.</div>';

  // Pending vs Resolved
  const pvr = document.getElementById('pend-res-chart');
  const total = grievances.length;
  const resolved = grievances.filter(g => g.status === 'Resolved').length;
  const pending = grievances.filter(g => g.status === 'Submitted').length;
  const inprog = grievances.filter(g => g.status === 'In Progress').length;
  if (pvr) pvr.innerHTML = `
    <div style="display:flex;gap:2rem;align-items:center"><div style="flex:1">
      <div style="display:flex;justify-content:space-between;margin-bottom:.3rem;font-size:.8rem;font-weight:600"><span>Resolved</span><span style="color:var(--success)">${resolved}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${total ? resolved / total * 100 : 0}%;background:linear-gradient(90deg,var(--success),#4ade80)"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:.8rem;margin-bottom:.3rem;font-size:.8rem;font-weight:600"><span>Pending</span><span style="color:var(--error)">${pending}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${total ? pending / total * 100 : 0}%;background:linear-gradient(90deg,var(--error),#f87171)"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:.8rem;margin-bottom:.3rem;font-size:.8rem;font-weight:600"><span>In Progress</span><span style="color:var(--warn)">${inprog}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${total ? inprog / total * 100 : 0}%;background:linear-gradient(90deg,var(--warn),#fbbf24)"></div></div>
    </div></div>`;
}

// ══════════════════════════════════════════
//  STAFF
// ══════════════════════════════════════════
function getStaffGrievances() { return grievances.filter(g => g.assigned); }

function updateStaffStats() {
  const gs = getStaffGrievances();
  set('st-assigned-n', gs.length);
  set('st-prog-n', gs.filter(g => g.status === 'In Progress').length);
  set('st-res-n', gs.filter(g => g.status === 'Resolved').length);
  set('st-badge', gs.filter(g => g.status !== 'Resolved' && g.status !== 'Rejected').length);
  renderStaffPending();
}

function renderStaffPending() {
  const pending = getStaffGrievances().filter(g => g.status !== 'Resolved' && g.status !== 'Rejected');
  const el = document.getElementById('st-pending-list');
  if (!pending.length) { el.innerHTML = '<div class="empty">No pending grievances. All done! ✅</div>'; return; }
  el.innerHTML = pending.map(g => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.8rem;border:1.5px solid var(--border);border-radius:10px;margin-bottom:.6rem;background:var(--bg)">
      <div>
        <div style="font-weight:700;color:var(--navy);font-size:.88rem">${g.sub}</div>
        <div style="font-size:.73rem;color:var(--muted)">${g.id} • ${g.prio} priority</div>
      </div>
      <button class="abtn primary" onclick="loadAndGoRespond('${g.id}')">Respond</button>
    </div>`).join('');
}

function renderStaffList() {
  const gs = getStaffGrievances();
  const tb = document.getElementById('st-list-tbody');
  if (!gs.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">No grievances assigned yet.</td></tr>'; return; }
  tb.innerHTML = gs.map(g => `
    <tr>
      <td style="font-weight:700;color:var(--cobalt);font-size:.78rem">${g.id}</td>
      <td>${g.sub}</td><td>${g.cat}</td>
      <td>${prioBadge(g.prio)}</td><td>${g.date}</td>
      <td><span class="badge ${badgeClass(g.status)}">${g.status}</span></td>
      <td><button class="abtn outline" onclick="loadAndGoRespond('${g.id}')">Respond</button></td>
    </tr>`).join('');
}

function populateStaffSelect() {
  const gs = getStaffGrievances().filter(g => g.status !== 'Resolved' && g.status !== 'Rejected');
  const sel = document.getElementById('st-select-g');
  sel.innerHTML = '<option value="">-- Select a grievance --</option>';
  gs.forEach(g => {
    const o = document.createElement('option');
    o.value = g.id; o.textContent = g.id + ' — ' + g.sub;
    sel.appendChild(o);
  });
}

function loadAndGoRespond(gid) {
  showPanel('st-respond');
  setTimeout(() => { document.getElementById('st-select-g').value = gid; loadStaffGrievance(gid); }, 100);
}

function loadStaffGrievance(gid) {
  const detail = document.getElementById('st-grievance-detail');
  if (!gid) { detail.style.display = 'none'; return; }
  const g = grievances.find(x => x.id === gid);
  if (!g) { detail.style.display = 'none'; return; }

  document.getElementById('std-sub').textContent = g.sub;
  document.getElementById('std-cat').textContent = g.cat;
  document.getElementById('std-name').textContent = g.name + ' (' + g.roll + ')';
  document.getElementById('std-prio').innerHTML = prioBadge(g.prio);
  document.getElementById('std-desc').textContent = g.desc;
  document.getElementById('st-response').value = g.response || '';
  document.getElementById('st-new-status').value = g.status !== 'Submitted' ? g.status : 'In Progress';
  detail.style.display = 'block';
  currentGID = gid;
}

function submitStaffResponse() {
  if (!currentGID) { toast('Select a grievance first', 'e'); return; }
  const resp = document.getElementById('st-response').value.trim();
  if (!resp) { toast('Please provide a response', 'e'); return; }
  const g = grievances.find(x => x.id === currentGID);
  if (!g) return;

  g.response = resp;
  g.status = document.getElementById('st-new-status').value;
  g.responseBy = 'Dept. Staff — ' + today();
  if (staffUploadedFiles.length) g.proofFiles = staffUploadedFiles.map(f => f.name);

  staffUploadedFiles = [];
  document.getElementById('staff-file-preview').innerHTML = '';
  document.getElementById('st-response').value = '';
  document.getElementById('st-grievance-detail').style.display = 'none';
  document.getElementById('st-select-g').value = '';

  toast('Response submitted! Status updated to: ' + g.status, 's');
  updateStaffStats();
  renderStaffList();
}

// ══════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════
function saveProfile() { toast('Profile updated successfully!', 's'); }
function goDashboard() {
  let role = localStorage.getItem("role");

  if (role === "student") {
    showPanel('s-home');   // ✅ student dashboard
  }
  else if (role === "staff") {
    showPanel('st-home');  // ✅ staff dashboard
  }
  else if (role === "admin") {
    showPanel('a-home');   // ✅ admin dashboard
  }
}
