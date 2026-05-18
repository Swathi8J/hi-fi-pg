// ===== CONFIG =====
// Netlify Functions are at /api/* (redirected via netlify.toml)
// Locally still uses localhost:3000
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : '/api';

// ===== DATA STORE =====
let students        = [];
let currentPGType   = '';
let currentLocation = '';
let currentUser     = null;

// ===== AUTH: TAB SWITCH =====
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('formLogin').style.display    = isLogin ? 'block' : 'none';
  document.getElementById('formRegister').style.display = isLogin ? 'none'  : 'block';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginError').style.display      = 'none';
  document.getElementById('registerError').style.display   = 'none';
  document.getElementById('registerSuccess').style.display = 'none';
}

// ===== AUTH: LOGIN =====
function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  btn.disabled = true;
  document.getElementById('loginBtnText').textContent = 'Signing in...';
  errEl.style.display = 'none';
  fetch(API + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    currentUser = data.user;
    // Update profile bar
    const nameEl   = document.getElementById('profileName');
    const avatarEl = document.getElementById('profileAvatar');
    if (nameEl)   nameEl.textContent   = data.user.full_name || data.user.username;
    if (avatarEl) avatarEl.textContent = (data.user.full_name || data.user.username).charAt(0).toUpperCase();
    document.getElementById('loginPage').style.display   = 'none';
    document.getElementById('landingPage').style.display = 'flex';
    initParticles(); initCounters(); initScrollReveal();
  })
  .catch(err => { errEl.textContent = 'Invalid email or password'; errEl.style.display = 'block'; })
  .finally(() => { btn.disabled = false; document.getElementById('loginBtnText').textContent = 'Sign In'; });
}

// ===== PASSWORD RULES =====
// Min 8 chars, at least 1 uppercase, at least 1 number, NO special characters
function validatePassword(pwd) {
  if (pwd.length < 8)                    return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pwd))               return 'Password must contain at least 1 capital letter';
  if (!/[0-9]/.test(pwd))               return 'Password must contain at least 1 number';
  if (/[^A-Za-z0-9]/.test(pwd))         return 'Password must not contain special characters';
  return null; // valid
}

// Live password strength checker
function checkPasswordStrength() {
  const pwd   = document.getElementById('regPass').value;
  const bar   = document.getElementById('pwdStrengthBar');
  const label = document.getElementById('pwdStrengthLabel');

  const has8   = pwd.length >= 8;
  const hasCap = /[A-Z]/.test(pwd);
  const hasNum = /[0-9]/.test(pwd);
  const noSpec = !/[^A-Za-z0-9]/.test(pwd);

  // Update rule indicators
  function setRule(id, pass) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (pass ? '✓ ' : '✗ ') + el.textContent.slice(2);
    el.className   = 'rule ' + (pass ? 'rule-pass' : '');
  }
  setRule('rule-len',  has8);
  setRule('rule-cap',  hasCap);
  setRule('rule-num',  hasNum);
  setRule('rule-spec', noSpec);

  if (!bar || !pwd) return;
  const score = [has8, hasCap, hasNum, noSpec].filter(Boolean).length;
  const levels = [
    { w: '25%',  color: '#e53e3e', text: 'Too weak' },
    { w: '50%',  color: '#dd6b20', text: 'Weak' },
    { w: '75%',  color: '#d69e2e', text: 'Almost there' },
    { w: '100%', color: '#38a169', text: 'Strong ✓' },
  ];
  const lvl = levels[score - 1] || levels[0];
  bar.style.width      = lvl.w;
  bar.style.background = lvl.color;
  if (label) { label.textContent = lvl.text; label.style.color = lvl.color; }
}

// ===== AUTH: REGISTER =====
function doRegister(e) {
  e.preventDefault();
  const btn      = document.getElementById('registerBtn');
  const errEl    = document.getElementById('registerError');
  const succEl   = document.getElementById('registerSuccess');
  const fullName = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPassConfirm').value;

  errEl.style.display = 'none'; succEl.style.display = 'none';

  // Validate password rules
  const pwdError = validatePassword(password);
  if (pwdError) {
    errEl.textContent = '❌ ' + pwdError; errEl.style.display = 'block';
    if (typeof shakeInput === 'function') shakeInput('regPass');
    return;
  }
  if (password !== confirm) {
    errEl.textContent = '❌ Passwords do not match'; errEl.style.display = 'block';
    if (typeof shakeInput === 'function') shakeInput('regPassConfirm');
    return;
  }

  btn.disabled = true;
  document.getElementById('registerBtnText').textContent = 'Creating account...';
  fetch(API + '/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, full_name: fullName })
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) throw new Error(data.error);
    succEl.textContent = '✅ ' + data.message; succEl.style.display = 'block';
    document.getElementById('registerForm').reset();
    const bar = document.getElementById('pwdStrengthBar');
    const lbl = document.getElementById('pwdStrengthLabel');
    if (bar) bar.style.width = '0';
    if (lbl) lbl.textContent = '';
    setTimeout(() => switchTab('login'), 2000);
  })
  .catch(err => { errEl.textContent = '❌ ' + err.message; errEl.style.display = 'block'; })
  .finally(() => { btn.disabled = false; document.getElementById('registerBtnText').textContent = 'Create Account'; });
}

function togglePass(fieldId) {
  const inp = document.getElementById(fieldId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function doLogout() {
  currentUser = null; currentPGType = ''; currentLocation = ''; students = [];
  document.getElementById('mainApp').style.display     = 'none';
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display   = 'flex';
  document.getElementById('loginForm').reset();
  document.getElementById('stepPGType').style.display   = 'block';
  document.getElementById('stepLocation').style.display = 'none';
  document.getElementById('stepBranch').style.display   = 'none';
  switchTab('login');
}

// ===== STEP 1: GENDER =====
function selectGender(type) {
  currentPGType = type;
  document.getElementById('selectedGenderBadge').textContent = (type === 'girls' ? 'Girls PG' : 'Boys PG');
  document.getElementById('stepPGType').style.display = 'none';
  const s = document.getElementById('stepLocation');
  s.style.display = 'block'; s.style.animation = 'fadeUp 0.4s ease both';
}
function backToGender() {
  currentLocation = '';
  document.getElementById('stepLocation').style.display = 'none';
  document.getElementById('stepPGType').style.display   = 'block';
}

// ===== STEP 2: CITY =====
function selectLocation(location) {
  currentLocation = location;
  const isTumkur = location === 'Tumkur';

  // Show correct set of branch cards filtered by city AND gender
  document.querySelectorAll('.tumkur-branch').forEach(el => {
    const gender = el.dataset.gender; // 'boys' or 'girls'
    const show = isTumkur && gender === currentPGType;
    el.style.display = show ? '' : 'none';
  });
  document.querySelectorAll('.mysore-branch').forEach(el => {
    const gender = el.dataset.gender;
    el.style.display = (!isTumkur && gender === currentPGType) ? '' : 'none';
  });

  // Update badge text
  const badge = document.getElementById('stepBranchBadge');
  if (badge) badge.textContent = (isTumkur ? '📍' : '🏰') + ' ' + location;

  document.getElementById('stepLocation').style.display = 'none';
  const s = document.getElementById('stepBranch');
  s.style.display = 'block'; s.style.animation = 'fadeUp 0.4s ease both';

  // Reset then animate visible cards
  document.querySelectorAll('.reveal-fast').forEach(el => el.classList.remove('visible'));
  setTimeout(() => {
    const sel = isTumkur ? '.tumkur-branch' : '.mysore-branch';
    let idx = 0;
    document.querySelectorAll(sel).forEach(el => {
      if (el.style.display !== 'none') {
        setTimeout(() => el.classList.add('visible'), idx * 120);
        idx++;
      }
    });
  }, 100);
}
function backToLocation() {
  currentLocation = '';
  document.getElementById('stepBranch').style.display   = 'none';
  document.getElementById('stepLocation').style.display = 'block';
}

// ===== STEP 3: BRANCH =====
function selectBranch(branch) {
  currentLocation = branch; enterApp();
}

// ===== ENTER APP =====
function enterApp() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('mainApp').style.display     = 'block';
  const header = document.querySelector('header');
  const pgTypeEl = document.getElementById('headerPGType');
  const locEl    = document.getElementById('headerLocation');
  if (currentPGType === 'girls') {
    header.classList.add('girls-mode'); header.classList.remove('boys-mode');
    pgTypeEl.textContent = 'Girls PG'; pgTypeEl.className = 'header-pgtype girls-type';
  } else {
    header.classList.add('boys-mode'); header.classList.remove('girls-mode');
    pgTypeEl.textContent = 'Boys PG'; pgTypeEl.className = 'header-pgtype boys-type';
  }
  locEl.textContent = (currentLocation.startsWith('Tumkur') ? '📍' : '🏰') + ' ' + currentLocation;
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.href = API + '/export/' + currentLocation + '/' + currentPGType;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-admission').classList.add('active');
  document.querySelectorAll('.nav-btn')[0].classList.add('active');
  document.getElementById('joiningDate').value = new Date().toISOString().split('T')[0];
}

function goHome() {
  document.getElementById('mainApp').style.display     = 'none';
  document.getElementById('landingPage').style.display = 'flex';
  document.getElementById('stepPGType').style.display   = 'block';
  document.getElementById('stepLocation').style.display = 'none';
  document.getElementById('stepBranch').style.display   = 'none';
  currentPGType = ''; currentLocation = ''; students = [];
}

function saveStudents() {}
// ===== LANDING ANIMATIONS =====
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initCounters();
  initScrollReveal();
});

// -- Floating particles --
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.8 + 0.4,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.5 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,179,237,${p.alpha})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
    });
    // draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,179,237,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// -- Animated counters --
function initCounters() {
  const nums = document.querySelectorAll('.stat-num');
  nums.forEach(el => {
    const target = +el.dataset.target;
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 35);
  });
}

// -- Scroll reveal for service cards --
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.svc-card, .location-card-full').forEach(card => observer.observe(card));
}


// ===== NAVIGATION =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  event.target.classList.add('active');
  if (page === 'students') loadAndRender();
}

// ===== RENT REMAINDER CALCULATION =====
function calcRemainder() {
  const rent      = parseFloat(document.getElementById('rent').value)      || 0;
  const duration  = parseFloat(document.getElementById('duration').value)  || 0;
  const advance   = parseFloat(document.getElementById('advance').value)   || 0;
  const advRet    = parseFloat(document.getElementById('advanceReturn').value) || 0;
  const rentPaid  = parseFloat(document.getElementById('rentPaid').value)  || 0;
  const outstanding = parseFloat(document.getElementById('outstanding').value) || 0;

  // Total rent due = monthly rent × duration
  // Remainder = total due - advance (net of return) - rent paid so far
  const totalDue  = rent * duration;
  const netAdv    = advance - advRet;
  const remainder = Math.max(0, totalDue - netAdv - rentPaid);
  const totalOutstanding = remainder + outstanding;

  document.getElementById('rentRemainder').value    = remainder.toFixed(0);
  document.getElementById('totalOutstanding').value = totalOutstanding.toFixed(0);
}

// ===== FORM SUBMIT — POST to MySQL via API =====
function submitForm(e) {
  e.preventDefault();

  const idFile = document.getElementById('idProof').files[0];
  if (!idFile) {
    showToast('ID Proof is required for admission!', true);
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const formData = new FormData();
  formData.append('location',          currentLocation);
  formData.append('pg_type',           currentPGType);
  formData.append('name',              document.getElementById('name').value.trim());
  formData.append('phone',             document.getElementById('phone').value.trim());
  formData.append('address',           document.getElementById('address').value.trim());
  formData.append('room_number',       document.getElementById('roomNumber').value.trim());
  formData.append('joining_date',      document.getElementById('joiningDate').value);
  formData.append('duration',          document.getElementById('duration').value);
  formData.append('rent',              document.getElementById('rent').value);
  formData.append('advance',           document.getElementById('advance').value || '0');
  formData.append('advance_return',    document.getElementById('advanceReturn').value || '0');
  formData.append('rent_paid',         document.getElementById('rentPaid').value || '0');
  formData.append('rent_remainder',    document.getElementById('rentRemainder').value || '0');
  formData.append('outstanding',       document.getElementById('outstanding').value || '0');
  formData.append('total_outstanding', document.getElementById('totalOutstanding').value || '0');
  formData.append('idProof',           idFile);

  fetch(API + '/students', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      const name = document.getElementById('name').value.trim();
      const room = document.getElementById('roomNumber').value.trim();
      showToast(`✅ ${name} admitted to Room ${room}!`);
      document.getElementById('admissionForm').reset();
      document.getElementById('rentRemainder').value    = '';
      document.getElementById('totalOutstanding').value = '';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('joiningDate').value = today;
    })
    .catch(err => showToast('Error: ' + err.message, true))
    .finally(() => { btn.disabled = false; btn.textContent = 'Admit Student'; });
}

// ===== RESET FORM =====
function resetForm() {
  document.getElementById('rentRemainder').value    = '';
  document.getElementById('totalOutstanding').value = '';
}

// ===== LOAD FROM API + RENDER =====
async function loadAndRender() {
  try {
    const res  = await fetch(`${API}/students/${currentLocation}/${currentPGType}`);
    students   = await res.json();
    if (students.error) throw new Error(students.error);
    renderTable();
  } catch (e) {
    showToast('Could not load students: ' + e.message, true);
  }
}

// ===== RENDER TABLE =====
function renderTable() {
  const query    = (document.getElementById('searchInput').value || '').toLowerCase();
  const filtered = students.filter(s =>
    (s.name        || '').toLowerCase().includes(query) ||
    (s.phone       || '').includes(query) ||
    (s.room_number || '').toLowerCase().includes(query)
  );

  const tbody   = document.getElementById('studentsBody');
  const empty   = document.getElementById('emptyState');
  const wrapper = document.getElementById('tableWrapper');
  const summary = document.getElementById('summaryBar');

  if (filtered.length === 0) {
    empty.style.display   = 'block';
    wrapper.style.display = 'none';
    summary.style.display = 'none';
    empty.querySelector('p').textContent = students.length === 0
      ? 'No students admitted yet. Use the Admission form to add students.'
      : 'No students match your search.';
    return;
  }

  empty.style.display   = 'none';
  wrapper.style.display = 'block';
  summary.style.display = 'flex';

  const totalRemainder   = filtered.reduce((a,s) => a + (+s.rent_remainder    || 0), 0);
  const totalOutstanding = filtered.reduce((a,s) => a + (+s.outstanding       || 0), 0);
  const totalDue         = filtered.reduce((a,s) => a + (+s.total_outstanding || 0), 0);
  document.getElementById('sumTotal').textContent       = filtered.length;
  document.getElementById('sumRemainder').textContent   = '₹' + totalRemainder.toLocaleString('en-IN');
  document.getElementById('sumOutstanding').textContent = '₹' + totalOutstanding.toLocaleString('en-IN');
  document.getElementById('sumTotal2').textContent      = '₹' + totalDue.toLocaleString('en-IN');

  tbody.innerHTML = filtered.map((s, i) => {
    const rem = +s.rent_remainder    || 0;
    const out = +s.outstanding       || 0;
    const due = +s.total_outstanding || 0;
    const remClass = rem > 0 ? 'remainder-cell' : 'remainder-zero';
    const remText  = rem > 0 ? `₹${rem.toLocaleString('en-IN')}` : '✓ Cleared';
    const outText  = out > 0 ? `₹${out.toLocaleString('en-IN')}` : '—';
    const dueClass = due > 0 ? 'outstanding-cell' : 'remainder-zero';
    const dueText  = due > 0 ? `₹${due.toLocaleString('en-IN')}` : '✓ Nil';
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.phone)}</td>
        <td>${esc(s.room_number)}</td>
        <td>${formatDate(s.joining_date)}</td>
        <td>${s.duration} mo</td>
        <td>₹${(+s.rent).toLocaleString('en-IN')}</td>
        <td>₹${(+s.advance).toLocaleString('en-IN')}</td>
        <td>₹${(+s.advance_return).toLocaleString('en-IN')}</td>
        <td class="${remClass}">${remText}</td>
        <td class="outstanding-col">${outText}</td>
        <td class="${dueClass}">${dueText}</td>
        <td><span class="id-link" onclick="viewIdProof(${s.id})">📄 View</span></td>
        <td>
          <button class="btn-view"   onclick="viewStudent(${s.id})">Details</button>
          <button class="btn-danger" onclick="deleteStudent(${s.id})" style="margin-left:6px">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

// ===== VIEW STUDENT DETAILS =====
function viewStudent(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;

  const rem  = parseFloat(s.rentRemainder)    || 0;
  const out  = parseFloat(s.outstanding)      || 0;
  const due  = parseFloat(s.totalOutstanding) || 0;

  const remColor = rem > 0 ? '#e53e3e' : '#38a169';
  const remText  = rem > 0 ? `₹${rem.toLocaleString('en-IN')} pending` : '✓ Fully Cleared';
  const outColor = out > 0 ? '#dd6b20' : '#38a169';
  const outText  = out > 0 ? `₹${out.toLocaleString('en-IN')}` : '✓ Nil';
  const dueColor = due > 0 ? '#e53e3e' : '#38a169';
  const dueText  = due > 0 ? `₹${due.toLocaleString('en-IN')} total due` : '✓ All Cleared';

  document.getElementById('modalContent').innerHTML = `
    <h2 style="color:#2b6cb0; margin-bottom:4px;">👤 ${esc(s.name)}</h2>
    <p style="color:#718096; font-size:0.85rem;">Admitted on ${s.admittedOn}</p>
    <div class="detail-grid">
      <div class="detail-item">
        <label>Phone</label>
        <p>${esc(s.phone)}</p>
      </div>
      <div class="detail-item">
        <label>Room Number</label>
        <p>${esc(s.roomNumber)}</p>
      </div>
      <div class="detail-item full">
        <label>Address</label>
        <p>${esc(s.address)}</p>
      </div>
      <div class="detail-item">
        <label>Joining Date</label>
        <p>${formatDate(s.joiningDate)}</p>
      </div>
      <div class="detail-item">
        <label>Duration</label>
        <p>${s.duration} months</p>
      </div>
      <div class="detail-item">
        <label>Monthly Rent</label>
        <p>₹${parseFloat(s.rent).toLocaleString('en-IN')}</p>
      </div>
      <div class="detail-item">
        <label>Advance Paid</label>
        <p>₹${parseFloat(s.advance).toLocaleString('en-IN')}</p>
      </div>
      <div class="detail-item">
        <label>Advance Return</label>
        <p>₹${parseFloat(s.advanceReturn).toLocaleString('en-IN')}</p>
      </div>
      <div class="detail-item">
        <label>Rent Paid So Far</label>
        <p>₹${parseFloat(s.rentPaid).toLocaleString('en-IN')}</p>
      </div>
      <div class="detail-item">
        <label>Rent Remainder</label>
        <p style="color:${remColor};">${remText}</p>
      </div>
      <div class="detail-item">
        <label>Outstanding Balance</label>
        <p style="color:${outColor};">${outText}</p>
      </div>
      <div class="detail-item" style="background:#fff5f5; border-radius:8px; padding:10px;">
        <label>⚠ Total Amount Due</label>
        <p style="color:${dueColor}; font-size:1.15rem;">${dueText}</p>
      </div>
    </div>
    <div style="margin-top:16px; text-align:center;">
      <button class="btn-view" onclick="viewIdProof(${s.id})">📄 View ID Proof</button>
    </div>
  `;
  openModal();
}

// ===== VIEW ID PROOF =====
function viewIdProof(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;

  let preview = '';
  if (s.idProofType && s.idProofType.startsWith('image/')) {
    preview = `<img src="${s.idProofData}" alt="ID Proof" />`;
  } else if (s.idProofType === 'application/pdf') {
    preview = `<iframe src="${s.idProofData}" title="ID Proof PDF"></iframe>`;
  } else {
    preview = `<p>Cannot preview this file type. <a href="${s.idProofData}" download="${s.idProofName}">Download</a></p>`;
  }

  document.getElementById('modalContent').innerHTML = `
    <h2 style="color:#2b6cb0; margin-bottom:4px;">📄 ID Proof</h2>
    <p style="color:#718096; font-size:0.85rem; margin-bottom:12px;">${esc(s.name)} — ${esc(s.idProofName)}</p>
    <div class="id-preview">${preview}</div>
    <div style="margin-top:14px; text-align:center;">
      <a href="${s.idProofData}" download="${s.idProofName}" class="btn-primary" style="text-decoration:none; padding:9px 20px; border-radius:6px; display:inline-block;">⬇ Download</a>
    </div>
  `;
  openModal();
}

// ===== DELETE STUDENT =====
function deleteStudent(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`Are you sure you want to remove ${s.name} from Room ${s.roomNumber}?`)) return;
  students = students.filter(x => x.id !== id);
  saveStudents();
  renderTable();
  showToast(`${s.name} removed.`);
}

// ===== MODAL =====
function openModal() {
  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal') || e.currentTarget.classList.contains('modal-close')) {
    document.getElementById('modal').classList.remove('open');
  }
}

// ===== TOAST NOTIFICATION =====
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast') || createToast();
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3500);
}

function createToast() {
  const t = document.createElement('div');
  t.id = 'toast';
  document.body.appendChild(t);
  return t;
}

// ===== HELPERS =====
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ===== INIT =====
// Landing page is shown on load; date is set when PG type is selected




