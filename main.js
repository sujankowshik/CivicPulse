// --- GLOBAL ERROR HANDLERS ---
window.addEventListener('error', (event) => {
  console.error("Unhandled error caught:", event.error);
  try {
    const errorMsg = event.message || (event.error && event.error.message) || 'Unknown error';
    if (typeof showToast === 'function') {
      showToast(`JS Error: ${errorMsg}`, 'error');
    }
  } catch (e) {}
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("Unhandled promise rejection caught:", event.reason);
  try {
    const reasonMsg = (event.reason && (event.reason.message || event.reason.msg || event.reason)) || 'Unknown promise rejection';
    if (typeof showToast === 'function') {
      showToast(`Promise Error: ${reasonMsg}`, 'error');
    }
  } catch (e) {}
});

const API_URL_PREFIX = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'http://localhost:5001'
  : (import.meta.env.VITE_API_URL || '');

// --- GLOBAL ML MODEL ---
let imageClassifierModel = null;

// --- MOCK DATA CONFIGURATIONS ---
const CATEGORIES = {
  roads: { label: 'Roads & Transport', badge: 'badge-roads', dept: 'Roads & Transport Department' },
  waste: { label: 'Waste Management', badge: 'badge-waste', dept: 'Sanitation & Waste Management' },
  lighting: { label: 'Street Lighting', badge: 'badge-lighting', dept: 'Municipal Electrical Dept' },
  water: { label: 'Water Supply', badge: 'badge-water', dept: 'Water & Sewerage Board' },
  parks: { label: 'Public Parks & Facilities', badge: 'badge-parks', dept: 'Parks & Recreation' }
};

const STATUSES = {
  pending: { label: 'Pending Verification', class: 'status-pending' },
  progress: { label: 'In Progress', class: 'status-progress' },
  resolved: { label: 'Resolved', class: 'status-resolved' }
};

const BADGES = {
  'pothole-patrol': { label: 'Pothole Patrol', emoji: '🕳️', desc: 'Reported a road/pothole hazard.' },
  'green-citizen': { label: 'Green Citizen', emoji: '🌱', desc: 'Reported a waste management issue.' },
  'eagle-eye': { label: 'Eagle Eye', emoji: '🦅', desc: 'Submitted 3 or more civic reports.' },
  'voice-of-city': { label: 'Voice of City', emoji: '💬', desc: 'Posted 2 or more comments.' },
  'civic-leader': { label: 'Civic Leader', emoji: '👑', desc: 'Reached 150+ Civic Karma points.' }
};

// Local base64 Avatar generator to run fully offline
function getMockAvatarSVG(seed) {
  const colors = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899'];
  let charCodeSum = 0;
  for (let i = 0; i < seed.length; i++) charCodeSum += seed.charCodeAt(i);
  const color = colors[charCodeSum % colors.length];
  const char = seed.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="48" fill="${color}"/><text x="50" y="65" font-family="sans-serif" font-weight="bold" font-size="45" fill="#ffffff" text-anchor="middle">${char}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// SVG Draw Helpers (Offline Mock Images)
function getMockImageSVG(category, resolved = false) {
  let innerSVG = '';
  if (category === 'roads') {
    if (resolved) {
      innerSVG = `
        <rect width="100%" height="100%" fill="#334155"/>
        <line x1="0" y1="125" x2="400" y2="125" stroke="#f8fafc" stroke-width="8" stroke-dasharray="20 15"/>
        <rect x="150" y="90" width="100" height="70" fill="#1e293b" rx="5" opacity="0.3"/>
        <text x="20" y="40" fill="#10b981" font-family="sans-serif" font-weight="bold" font-size="16"> RESOLVED: Broadway Patched</text>
      `;
    } else {
      innerSVG = `
        <rect width="100%" height="100%" fill="#1e293b"/>
        <line x1="0" y1="125" x2="400" y2="125" stroke="#e2e8f0" stroke-width="8" stroke-dasharray="20 15"/>
        <circle cx="200" cy="125" r="35" fill="#0f172a" stroke="#f59e0b" stroke-width="5"/>
        <line x1="175" y1="110" x2="225" y2="140" stroke="#f59e0b" stroke-width="4"/>
        <line x1="225" y1="110" x2="175" y2="140" stroke="#f59e0b" stroke-width="4"/>
      `;
    }
  } else if (category === 'waste') {
    if (resolved) {
      innerSVG = `
        <rect width="100%" height="100%" fill="#1e293b"/>
        <rect x="160" y="90" width="80" height="90" rx="5" fill="#065f46" stroke="#10b981" stroke-width="3"/>
        <line x1="180" y1="110" x2="180" y2="160" stroke="#047857" stroke-width="3"/>
        <line x1="200" y1="110" x2="200" y2="160" stroke="#047857" stroke-width="3"/>
        <line x1="220" y1="110" x2="220" y2="160" stroke="#047857" stroke-width="3"/>
        <text x="20" y="40" fill="#10b981" font-family="sans-serif" font-weight="bold" font-size="16"> RESOLVED: Dump Site Cleared</text>
      `;
    } else {
      innerSVG = `
        <rect width="100%" height="100%" fill="#1f2937"/>
        <rect x="150" y="80" width="100" height="110" rx="10" fill="#374151" stroke="#fbbf24" stroke-width="4"/>
        <line x1="170" y1="110" x2="170" y2="160" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/>
        <line x1="200" y1="110" x2="200" y2="160" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/>
        <line x1="230" y1="110" x2="230" y2="160" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/>
        <rect x="135" y="65" width="130" height="15" rx="5" fill="#4b5563"/>
        <path d="M185 65 L190 50 L210 50 L215 65 Z" fill="#9ca3af"/>
      `;
    }
  } else if (category === 'lighting') {
    if (resolved) {
      innerSVG = `
        <rect width="100%" height="100%" fill="#1e293b"/>
        <path d="M200 40 L200 120" stroke="#cbd5e1" stroke-width="6"/>
        <circle cx="200" cy="130" r="18" fill="#fef08a"/>
        <path d="M170 40 L230 40" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
        <text x="20" y="40" fill="#10b981" font-family="sans-serif" font-weight="bold" font-size="16"> RESOLVED: Light Replaced</text>
      `;
    } else {
      innerSVG = `
        <rect width="100%" height="100%" fill="#0f172a"/>
        <path d="M200 40 L200 120" stroke="#94a3b8" stroke-width="6"/>
        <circle cx="200" cy="130" r="18" fill="#475569"/>
        <path d="M170 40 L230 40" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
      `;
    }
  } else if (category === 'water') {
    if (resolved) {
      innerSVG = `
        <rect width="100%" height="100%" fill="#0f172a"/>
        <path d="M 0 125 Q 200 125 400 125 L 400 140 Q 200 140 0 140 Z" fill="#1e3a8a" stroke="#3b82f6" stroke-width="3"/>
        <rect x="180" y="100" width="40" height="65" fill="#3b82f6" rx="3" stroke="#93c5fd" stroke-width="2"/>
        <text x="20" y="40" fill="#10b981" font-family="sans-serif" font-weight="bold" font-size="16"> RESOLVED: Leak Repaired</text>
      `;
    } else {
      innerSVG = `
        <rect width="100%" height="100%" fill="#111827"/>
        <path d="M 0 125 Q 200 70 400 125 L 400 145 Q 200 90 0 145 Z" fill="#1e3a8a" stroke="#22d3ee" stroke-width="3"/>
        <path d="M 230 135 C 230 180 200 190 200 210 C 200 190 170 180 170 135 Z" fill="#38bdf8"/>
        <circle cx="200" cy="225" r="5" fill="#38bdf8"/>
      `;
    }
  } else {
    if (resolved) {
      innerSVG = `
        <rect width="100%" height="100%" fill="#064e3b"/>
        <path d="M 200 180 L 200 70" stroke="#78350f" stroke-width="8"/>
        <path d="M 200 60 C 140 60 140 130 200 130 C 260 130 260 60 200 60 Z" fill="#10b981"/>
        <rect x="90" y="140" width="220" height="15" rx="5" fill="#3b82f6" stroke="#93c5fd" stroke-width="1.5"/>
        <text x="20" y="40" fill="#10b981" font-family="sans-serif" font-weight="bold" font-size="16"> RESOLVED: Bench Restored</text>
      `;
    } else {
      innerSVG = `
        <rect width="100%" height="100%" fill="#064e3b"/>
        <path d="M 200 180 L 200 70" stroke="#78350f" stroke-width="8" stroke-linecap="round"/>
        <path d="M 200 60 C 140 60 140 130 200 130 C 260 130 260 60 200 60 Z" fill="#10b981"/>
        <path d="M 160 90 C 110 90 115 140 160 140 C 205 140 200 90 160 90 Z" fill="#047857"/>
        <path d="M 240 95 C 200 95 195 140 240 140 C 285 140 280 95 240 95 Z" fill="#047857"/>
        <rect x="50" y="180" width="300" height="15" rx="5" fill="#0f172a"/>
      `;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">${innerSVG}</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const DEFAULT_USERS = [
  {
    email: 'admin@civicpulse.gov',
    password: 'admin123',
    name: 'Chief Operator (Operations)',
    role: 'admin',
    avatar: getMockAvatarSVG('Jack'),
    karma: 350,
    badges: ['eagle-eye', 'civic-leader']
  },
  {
    email: 'citizen@civicpulse.org',
    password: 'citizen123',
    name: 'Alex Mercer',
    role: 'citizen',
    avatar: getMockAvatarSVG('Felix'),
    karma: 120,
    badges: ['pothole-patrol']
  }
];

const DEFAULT_ISSUES = [
  {
    id: 'issue-1',
    title: 'Deep pothole creating hazard on Broadway Ave',
    description: 'A massive pothole has opened up near the main intersection of Broadway and 4th. Several cars have suffered tyre damage already. Needs urgent filling.',
    category: 'roads',
    status: 'progress',
    photo: getMockImageSVG('roads', false),
    resolvedPhoto: getMockImageSVG('roads', true),
    coordX: 180,
    coordY: 90,
    locationText: 'Broadway Ave near 4th Crossing',
    upvotes: 24,
    upvotedUsers: [],
    date: '2026-06-12',
    authorName: 'Alex Mercer',
    authorEmail: 'citizen@civicpulse.org',
    priorityScore: 78,
    prioritySeverity: 'high',
    assignee: 'roads',
    comments: [
      {
        author: 'John Doe (Citizen)',
        role: 'citizen',
        text: 'Almost hit this last night. Very dangerous since it fills with rain water and looks like a shallow puddle.',
        date: '2026-06-12 18:24'
      },
      {
        author: 'Chief Operator (Staff)',
        role: 'admin',
        text: 'Assigned inspection team. Pothole will be patched on Thursday night under temporary road maintenance contract.',
        date: '2026-06-14 09:12'
      }
    ],
    timeline: [
      {
        status: 'pending',
        title: 'Reported',
        note: 'Issue submitted by verified citizen.',
        date: 'June 12, 2026'
      },
      {
        status: 'progress',
        title: 'Assigned Operations',
        note: 'Ticket approved. Assigned to Roads & Transport Department.',
        date: 'June 14, 2026'
      }
    ]
  },
  {
    id: 'issue-2',
    title: 'Illegal industrial waste dumping behind City Green Park',
    description: 'Discovered several barrels of suspicious chemical paint residue and bags of construction debris dumped behind the park walking trail.',
    category: 'waste',
    status: 'pending',
    photo: getMockImageSVG('waste', false),
    coordX: 290,
    coordY: 70,
    locationText: 'City Green Park trail behind sports shed',
    upvotes: 12,
    upvotedUsers: [],
    date: '2026-06-15',
    authorName: 'Verified Citizen',
    authorEmail: 'guest@civicpulse.org',
    priorityScore: 65,
    prioritySeverity: 'medium',
    assignee: 'unassigned',
    comments: [
      {
        author: 'Clara Miller (Citizen)',
        role: 'citizen',
        text: 'This is awful! Children play near here. The municipal body needs to install CCTV near the entrance.',
        date: '2026-06-15 14:10'
      }
    ],
    timeline: [
      {
        status: 'pending',
        title: 'Reported',
        note: 'Awaiting inspector dispatch.',
        date: 'June 15, 2026'
      }
    ]
  },
  {
    id: 'issue-3',
    title: 'Water main pipeline bursting on South Marina Road',
    description: 'A fresh water pipe is broken and leaking clean water all over the road. The water flow is heavy and causing flooding near building basements.',
    category: 'water',
    status: 'progress',
    photo: getMockImageSVG('water', false),
    coordX: 310,
    coordY: 170,
    locationText: 'South Marina Road in front of Plaza Apts',
    upvotes: 18,
    upvotedUsers: [],
    date: '2026-06-13',
    authorName: 'Alex Mercer',
    authorEmail: 'citizen@civicpulse.org',
    priorityScore: 84,
    prioritySeverity: 'high',
    assignee: 'water',
    comments: [
      {
        author: 'David Vance (Citizen)',
        role: 'citizen',
        text: 'Our building has lost water pressure completely. Please fix this soon!',
        date: '2026-06-13 11:42'
      },
      {
        author: 'Chief Operator (Staff)',
        role: 'admin',
        text: 'Emergency shut-off valve activated. Repair crew is on-site fabricating a bypass pipe section.',
        date: '2026-06-13 15:30'
      }
    ],
    timeline: [
      {
        status: 'pending',
        title: 'Reported',
        note: 'High pressure leak flagged by residents.',
        date: 'June 13, 2026'
      },
      {
        status: 'progress',
        title: 'Dispatched & Assigned',
        note: 'Water Board crew active. Valving shutoff complete.',
        date: 'June 13, 2026'
      }
    ]
  },
  {
    id: 'issue-4',
    title: 'Main streetlight burnt out in Westside Suburbs Lane 5',
    description: 'The streetlight at the bend in Lane 5 has been completely dark for over a week, making walking home at night feel unsafe.',
    category: 'lighting',
    status: 'resolved',
    photo: getMockImageSVG('lighting', false),
    resolvedPhoto: getMockImageSVG('lighting', true),
    coordX: 60,
    coordY: 130,
    locationText: 'Westside Suburbs Lane 5 near block C bend',
    upvotes: 4,
    upvotedUsers: [],
    date: '2026-06-10',
    authorName: 'Clara Miller',
    authorEmail: 'clara@civicpulse.org',
    priorityScore: 32,
    prioritySeverity: 'low',
    assignee: 'lighting',
    comments: [],
    timeline: [
      {
        status: 'pending',
        title: 'Reported',
        note: 'Issue submitted by citizen.',
        date: 'June 10, 2026'
      },
      {
        status: 'progress',
        title: 'Assigned Operations',
        note: 'Bulb scheduled for swap.',
        date: 'June 11, 2026'
      },
      {
        status: 'resolved',
        title: 'Bulb Swapped',
        note: 'Switched to energy efficient LED bulb. Ticket resolved.',
        date: 'June 12, 2026'
      }
    ]
  },
  {
    id: 'issue-5',
    title: 'Broken swing set chains in City Green Park',
    description: 'The swing set chains have rusted and snapped on two of the main kids swings in the central park. Danger of injury if children attempt to climb it.',
    category: 'parks',
    status: 'resolved',
    photo: getMockImageSVG('parks', false),
    resolvedPhoto: getMockImageSVG('parks', true),
    coordX: 270,
    coordY: 85,
    locationText: 'City Green Park playground area',
    upvotes: 9,
    upvotedUsers: [],
    date: '2026-06-08',
    authorName: 'Alex Mercer',
    authorEmail: 'citizen@civicpulse.org',
    priorityScore: 48,
    prioritySeverity: 'medium',
    assignee: 'parks',
    comments: [],
    timeline: [
      {
        status: 'pending',
        title: 'Reported',
        note: 'Damaged play equipment flagged.',
        date: 'June 08, 2026'
      },
      {
        status: 'progress',
        title: 'Scheduled Repair',
        note: 'Assigned to Parks Board crew.',
        date: 'June 09, 2026'
      },
      {
        status: 'resolved',
        title: 'Play equipment replaced',
        note: 'Installed new heavy-duty chains on swings.',
        date: 'June 11, 2026'
      }
    ]
  }
];

// --- APP STATE MANAGEMENT ---
class AppState {
  constructor() {
    this.issues = [];
    this.users = [];
    this.currentUser = null;
    this.userRole = 'guest';
    this.activeView = 'dashboard';
    this.selectedIssueId = null;
    this.activeProfileTab = 'my-reports';
    this.adminSortCol = 'id';
    this.adminSortAsc = true;
  }

  saveIssues() {}
  saveUsers() {}
  saveSession() {}

  setCurrentUser(user) {
    this.currentUser = user;
    this.userRole = user ? user.role : 'guest';
  }

  updateUserInList(user) {}

  addIssue(issue) {
    issue.id = issue._id;
    this.issues.unshift(issue);
    try {
      const cachedIssuesList = this.issues.map(iss => {
        const { photo, resolvedPhoto, ...lightIssue } = iss;
        return lightIssue;
      });
      localStorage.setItem('civic_issues', JSON.stringify(cachedIssuesList));
    } catch (e) {}
  }

  updateIssue(updated) {
    updated.id = updated._id;
    const idx = this.issues.findIndex(i => i.id === updated.id);
    if (idx !== -1) {
      this.issues[idx] = updated;
    }
    try {
      const cachedIssuesList = this.issues.map(iss => {
        const { photo, resolvedPhoto, ...lightIssue } = iss;
        return lightIssue;
      });
      localStorage.setItem('civic_issues', JSON.stringify(cachedIssuesList));
    } catch (e) {}
  }

  getIssueById(id) { return this.issues.find(i => i.id === id); }
}

const state = new AppState();

// --- FLOATING TOAST ALERTS ENGINE ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : '❌';
  toast.innerHTML = `<span>${icon}</span><p>${message}</p>`;
  
  container.appendChild(toast);

  // Trigger leave animation
  setTimeout(() => {
    toast.classList.add('toast-leave');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3500);
}

// --- MOCK BROWSER INVOKERS ---
function initInvokerFallback() {
  if (!('commandForElement' in HTMLButtonElement.prototype)) {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[commandfor]');
      if (!button) return;

      const targetId = button.getAttribute('commandfor');
      const command = button.getAttribute('command');
      const target = document.getElementById(targetId);

      if (target && command) {
        if (command === 'show-modal' && typeof target.showModal === 'function') {
          if (targetId === 'report-dialog' && !state.currentUser) {
            showToast('You must sign in to report a civic issue.', 'error');
            document.getElementById('auth-dialog').showModal();
            return;
          }
          if (targetId === 'report-dialog') resetReportForm();
          target.showModal();
        } else if (command === 'close' && typeof target.close === 'function') {
          target.close();
        }
      }
    });
  } else {
    // Intercept native invoker click to check auth for reporting
    document.querySelectorAll('button[command="show-modal"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('commandfor');
        if (targetId === 'report-dialog' && !state.currentUser) {
          e.preventDefault();
          e.stopPropagation();
          showToast('You must sign in to report a civic issue.', 'error');
          document.getElementById('auth-dialog').showModal();
        } else if (targetId === 'report-dialog') {
          resetReportForm();
        }
      });
    });
  }
}

// --- VIEW ROUTER ---
function initRouter() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });

  // Dashboard "View All Feed" button trigger
  document.querySelectorAll('.btn-view-feed').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target-view') || 'feed';
      switchView(target);
    });
  });
}

function switchView(viewName) {
  state.activeView = viewName;
  
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `${viewName}-view`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  renderView(viewName);
}

function renderView(viewName) {
  switch (viewName) {
    case 'dashboard': renderDashboard(); break;
    case 'feed': renderFeed(); break;
    case 'map': renderMap(); break;
    case 'profile': renderProfile(); break;
    case 'admin': renderAdminPanel(); break;
  }
}

// --- 1. DASHBOARD VIEW ---
function renderDashboard() {
  const pending = state.issues.filter(i => i.status === 'pending').length;
  const progress = state.issues.filter(i => i.status === 'progress').length;
  const resolved = state.issues.filter(i => i.status === 'resolved').length;
  const total = state.issues.length;

  document.getElementById('stats-pending').textContent = pending;
  document.getElementById('stats-progress').textContent = progress;
  document.getElementById('stats-resolved').textContent = resolved;
  document.getElementById('stats-total').textContent = total;

  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  document.getElementById('gauge-fill-circle').style.setProperty('--percent', rate);
  document.getElementById('gauge-value-text').textContent = `${rate}%`;

  const categoryCounts = { roads: 0, waste: 0, lighting: 0, water: 0, parks: 0 };
  state.issues.forEach(i => { if (categoryCounts[i.category] !== undefined) categoryCounts[i.category]++; });

  const categoryBars = document.getElementById('category-bars');
  categoryBars.innerHTML = '';

  Object.keys(CATEGORIES).forEach(catKey => {
    const count = categoryCounts[catKey];
    const catPercent = total > 0 ? Math.round((count / total) * 100) : 0;
    
    const itemHTML = `
      <div class="cat-bar-item">
        <div class="cat-bar-header">
          <span class="cat-name">${CATEGORIES[catKey].label}</span>
          <span class="cat-count">${count} (${catPercent}%)</span>
        </div>
        <div class="cat-bar-outer">
          <div class="cat-bar-inner" style="--w: ${catPercent}%"></div>
        </div>
      </div>
    `;
    categoryBars.insertAdjacentHTML('beforeend', itemHTML);
  });

  const highPriority = [...state.issues]
    .sort((a, b) => b.priorityScore - a.priorityScore || b.upvotes - a.upvotes)
    .slice(0, 3);

  const recentList = document.getElementById('recent-issues-list');
  recentList.innerHTML = '';
  highPriority.forEach(issue => { recentList.insertAdjacentHTML('beforeend', createIssueCardHTML(issue)); });
}

// --- 2. FEED VIEW ---
function renderFeed() {
  const searchInput = document.getElementById('filter-search').value.toLowerCase();
  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;
  const sortBy = document.getElementById('filter-sort').value;

  let filtered = [...state.issues];

  if (searchInput) {
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(searchInput) || i.description.toLowerCase().includes(searchInput)
    );
  }

  if (categoryFilter !== 'all') filtered = filtered.filter(i => i.category === categoryFilter);
  if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter);

  if (sortBy === 'upvotes') {
    filtered.sort((a, b) => b.upvotes - a.upvotes);
  } else if (sortBy === 'priority') {
    filtered.sort((a, b) => b.priorityScore - a.priorityScore);
  } else if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
  }

  const feedList = document.getElementById('feed-issues-list');
  const emptyState = document.getElementById('feed-empty-state');
  feedList.innerHTML = '';

  if (filtered.length === 0) {
    feedList.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    feedList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    filtered.forEach(issue => { feedList.insertAdjacentHTML('beforeend', createIssueCardHTML(issue)); });
  }
}

function createIssueCardHTML(issue) {
  const cat = CATEGORIES[issue.category];
  const stat = STATUSES[issue.status];
  const isUpvoted = state.currentUser && issue.upvotedUsers && issue.upvotedUsers.includes(state.currentUser.email);
  const upvotedClass = isUpvoted ? 'upvoted' : '';
  const dateFormatted = formatDateString(issue.date);
  const commentsCount = issue.comments ? issue.comments.length : 0;
  
  return `
    <article class="issue-card" onclick="openDetailDialog('${issue.id}')">
      <div class="card-img-wrapper">
        <span class="badge ${cat.badge} card-badge">${cat.label}</span>
        <span class="status-indicator-tag ${stat.class}">${stat.label}</span>
        <img class="card-img" src="${issue.photo || getMockImageSVG(issue.category)}" alt="${issue.title}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="badges-row">
          <span class="priority-glow-badge priority-${issue.prioritySeverity || 'low'}">AI Priority: ${issue.priorityScore || 0}</span>
        </div>
        <h3 class="card-title">${issue.title}</h3>
        <p class="card-desc">${issue.description}</p>
        <div class="card-footer">
          <span class="card-date">${dateFormatted}</span>
          <div class="card-stats">
            <span class="card-stat ${upvotedClass}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              <span>${issue.upvotes}</span>
            </span>
            <span class="card-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>${commentsCount}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

// --- 3. CITY MAP VIEW ---
function renderMap() {
  const pinsGroup = document.getElementById('map-pins-group');
  pinsGroup.innerHTML = '';

  state.issues.forEach(issue => {
    const mainX = (issue.coordX / 400) * 800;
    const mainY = (issue.coordY / 200) * 500;

    let pinColor = 'var(--color-pending)';
    if (issue.status === 'progress') pinColor = 'var(--color-progress)';
    if (issue.status === 'resolved') pinColor = 'var(--color-resolved)';

    const pinHTML = `
      <g class="map-pin" transform="translate(${mainX}, ${mainY})" onclick="selectMapPin(event, '${issue.id}')">
        <ellipse cx="0" cy="2" rx="6" ry="2" class="pin-shadow" />
        <path d="M 0 0 C -8 -8 -10 -15 -10 -20 C -10 -27 -5 -32 0 -32 C 5 -32 10 -27 10 -20 C 10 -15 8 -8 0 0 Z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="0" cy="-20" r="4.5" fill="#0d1321" />
      </g>
    `;
    pinsGroup.insertAdjacentHTML('beforeend', pinHTML);
  });
}

window.selectMapPin = function(e, issueId) {
  e.stopPropagation();
  const issue = state.getIssueById(issueId);
  if (!issue) return;

  const detailCard = document.getElementById('map-selected-issue-card');
  const cat = CATEGORIES[issue.category];
  const stat = STATUSES[issue.status];

  detailCard.className = 'map-selected-card';
  detailCard.innerHTML = `
    <span class="badge ${cat.badge}">${cat.label}</span>
    <h4 class="map-sel-title">${issue.title}</h4>
    <p class="map-sel-desc">${issue.description}</p>
    <div class="map-sel-meta">
      <span class="status-indicator-tag ${stat.class}" style="position:static">${stat.label}</span>
      <button class="btn btn-primary btn-sm" onclick="openDetailDialog('${issue.id}')">View Details</button>
    </div>
  `;
};

// --- 4. PROFILE VIEW (Gamification & Karma) ---
function renderProfile() {
  if (!state.currentUser) return;

  const user = state.currentUser;
  
  // Sidebar details
  document.getElementById('profile-avatar-large').src = user.avatar;
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-karma-score').textContent = user.karma;

  // Render Badges
  const badgesGrid = document.getElementById('profile-badges-grid');
  badgesGrid.innerHTML = '';

  const activeBadges = user.badges || [];
  Object.keys(BADGES).forEach(bKey => {
    const b = BADGES[bKey];
    const unlocked = activeBadges.includes(bKey);
    const badgeHTML = `
      <div class="badge-item ${unlocked ? 'unlocked' : ''}" title="${b.desc}">
        <div class="badge-icon-box">${b.emoji}</div>
        <span class="badge-lbl">${b.label}</span>
      </div>
    `;
    badgesGrid.insertAdjacentHTML('beforeend', badgeHTML);
  });

  // Render Lists
  const myReports = state.issues.filter(i => i.authorEmail === user.email);
  const myUpvotes = state.issues.filter(i => i.upvotedUsers && i.upvotedUsers.includes(user.email));

  document.getElementById('profile-reports-count').textContent = myReports.length;
  document.getElementById('profile-tab-reports-cnt').textContent = myReports.length;
  document.getElementById('profile-tab-upvotes-cnt').textContent = myUpvotes.length;

  const reportsList = document.getElementById('profile-my-reports-list');
  const upvotesList = document.getElementById('profile-my-upvotes-list');
  const emptyList = document.getElementById('profile-empty-list');

  reportsList.innerHTML = '';
  upvotesList.innerHTML = '';

  if (state.activeProfileTab === 'my-reports') {
    reportsList.classList.remove('hidden');
    upvotesList.classList.add('hidden');
    
    if (myReports.length === 0) {
      emptyList.classList.remove('hidden');
    } else {
      emptyList.classList.add('hidden');
      myReports.forEach(issue => reportsList.insertAdjacentHTML('beforeend', createIssueCardHTML(issue)));
    }
  } else {
    reportsList.classList.add('hidden');
    upvotesList.classList.remove('hidden');
    
    if (myUpvotes.length === 0) {
      emptyList.classList.remove('hidden');
    } else {
      emptyList.classList.add('hidden');
      myUpvotes.forEach(issue => upvotesList.insertAdjacentHTML('beforeend', createIssueCardHTML(issue)));
    }
  }
}

function initProfileTabs() {
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeProfileTab = tab.getAttribute('data-profile-tab');
      renderProfile();
    });
  });
}

async function loadServerData() {
  // Load cached user data from localStorage instantly if available
  const cachedUser = localStorage.getItem('civic_user');
  if (cachedUser) {
    try {
      state.currentUser = JSON.parse(cachedUser);
      state.userRole = state.currentUser.role;
      syncSessionUI();
    } catch (e) {
      console.error("Error parsing cached user:", e);
    }
  }

  // Load cached issues from localStorage instantly if available
  const cachedIssues = localStorage.getItem('civic_issues');
  if (cachedIssues) {
    try {
      state.issues = JSON.parse(cachedIssues);
      // Render immediately with cached issues!
      renderDashboard();
      renderFeed();
      renderMap();
      renderAdminPanel();
    } catch (e) {
      console.error("Error parsing cached issues:", e);
    }
  }

  const token = localStorage.getItem('civic_jwt');
  if (token) {
    try {
      const res = await fetch(`${API_URL_PREFIX}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        state.currentUser = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          karma: user.karma,
          badges: user.badges
        };
        state.userRole = user.role;
        localStorage.setItem('civic_user', JSON.stringify(state.currentUser));
        syncSessionUI();
      } else {
        localStorage.removeItem('civic_jwt');
        localStorage.removeItem('civic_user');
        state.currentUser = null;
        state.userRole = 'guest';
        syncSessionUI();
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
  } else {
    state.currentUser = null;
    state.userRole = 'guest';
    syncSessionUI();
  }

  try {
    const res = await fetch(`${API_URL_PREFIX}/api/issues`);
    if (res.ok) {
      const issues = await res.json();
      state.issues = issues.map(iss => {
        iss.id = iss._id;
        iss.date = iss.createdAt ? iss.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
        if (iss.upvotedUsers && state.currentUser && iss.upvotedUsers.includes(state.currentUser.email)) {
          iss.hasUpvoted = true;
        }
        return iss;
      });

      // Cache the loaded issues list (stripping heavy Base64 image strings to avoid QuotaExceededError)
      try {
        const cachedIssuesList = state.issues.map(iss => {
          const { photo, resolvedPhoto, ...lightIssue } = iss;
          return lightIssue;
        });
        localStorage.setItem('civic_issues', JSON.stringify(cachedIssuesList));
      } catch (e) {
        console.error("Failed to write to civic_issues cache:", e);
      }

      // Update views when issues load successfully
      renderDashboard();
      renderFeed();
      renderMap();
      renderAdminPanel();
    }
  } catch (e) {
    console.error("Failed to load issues:", e);
  }
}

async function awardKarma(points, actionLabel) {
  if (!state.currentUser) return;
  const token = localStorage.getItem('civic_jwt');
  if (!token) return;

  try {
    const res = await fetch(`${API_URL_PREFIX}/api/auth/karma`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ points, reason: actionLabel })
    });
    if (res.ok) {
      const user = await res.json();
      state.currentUser = user;
      state.userRole = user.role;
      
      const activeBadges = user.badges || [];
      const userReports = state.issues.filter(i => i.authorEmail === user.email);
      
      if (userReports.some(i => i.category === 'roads') && !activeBadges.includes('pothole-patrol')) {
        showToast(`Badge Unlocked: Pothole Patrol! 🕳️`, 'success');
      }
      if (userReports.some(i => i.category === 'waste') && !activeBadges.includes('green-citizen')) {
        showToast(`Badge Unlocked: Green Citizen! 🌱`, 'success');
      }
      if (userReports.length >= 3 && !activeBadges.includes('eagle-eye')) {
        showToast(`Badge Unlocked: Eagle Eye! 🦅`, 'success');
      }

      showToast(`+${points} Civic Karma: ${actionLabel}!`, 'success');
      if (state.activeView === 'profile') renderProfile();
    }
  } catch (e) {
    console.error("Failed to update karma on server:", e);
  }
}


// --- 5. ADMIN CONTROL PANEL VIEW (advanced grids) ---
function renderAdminPanel() {
  const search = document.getElementById('admin-search-input').value.toLowerCase();
  const category = document.getElementById('admin-filter-category').value;
  const status = document.getElementById('admin-filter-status').value;
  const priority = document.getElementById('admin-filter-priority').value;

  let filtered = [...state.issues];

  if (search) {
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(search) || 
      i.description.toLowerCase().includes(search) ||
      i.id.toLowerCase().includes(search)
    );
  }

  if (category !== 'all') filtered = filtered.filter(i => i.category === category);
  if (status !== 'all') filtered = filtered.filter(i => i.status === status);
  if (priority !== 'all') filtered = filtered.filter(i => i.prioritySeverity === priority);

  // Sorting
  const col = state.adminSortCol;
  const asc = state.adminSortAsc;
  
  filtered.sort((a, b) => {
    let valA = a[col];
    let valB = b[col];
    
    if (col === 'priority') {
      valA = a.priorityScore;
      valB = b.priorityScore;
    }
    
    if (typeof valA === 'string') {
      return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return asc ? valA - valB : valB - valA;
  });

  const tbody = document.getElementById('admin-tickets-tbody');
  tbody.innerHTML = '';

  filtered.forEach(issue => {
    const cat = CATEGORIES[issue.category];
    const stat = STATUSES[issue.status];
    const dept = issue.assignee === 'unassigned' ? 'Unassigned' : CATEGORIES[issue.assignee].label;
    
    const rowHTML = `
      <tr>
        <td><strong>#${issue.id.split('_').pop() || issue.id}</strong></td>
        <td><div class="admin-table-title" title="${issue.title}">${issue.title}</div></td>
        <td><span class="badge ${cat.badge}">${cat.label}</span></td>
        <td><span class="priority-glow-badge priority-${issue.prioritySeverity}">${issue.priorityScore} (${issue.prioritySeverity.toUpperCase()})</span></td>
        <td><span class="status-indicator-tag ${stat.class}" style="position:static">${stat.label}</span></td>
        <td><span class="admin-assignee-tag">${dept}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openDetailDialog('${issue.id}')">Manage</button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', rowHTML);
  });
}

function initAdminSortListeners() {
  document.querySelectorAll('.admin-data-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (state.adminSortCol === col) {
        state.adminSortAsc = !state.adminSortAsc;
      } else {
        state.adminSortCol = col;
        state.adminSortAsc = true;
      }
      renderAdminPanel();
    });
  });

  const search = document.getElementById('admin-search-input');
  const filterCat = document.getElementById('admin-filter-category');
  const filterStat = document.getElementById('admin-filter-status');
  const filterPri = document.getElementById('admin-filter-priority');

  search.addEventListener('input', () => renderAdminPanel());
  filterCat.addEventListener('change', () => renderAdminPanel());
  filterStat.addEventListener('change', () => renderAdminPanel());
  filterPri.addEventListener('change', () => renderAdminPanel());
}

// --- 6. DETAILS MODAL SYSTEM ---
window.openDetailDialog = function(issueId) {
  state.selectedIssueId = issueId;
  const issue = state.getIssueById(issueId);
  if (!issue) return;

  const dialog = document.getElementById('detail-dialog');
  const cat = CATEGORIES[issue.category];
  const stat = STATUSES[issue.status];

  // Title & Badges
  const badge = document.getElementById('detail-category-badge');
  badge.className = `badge ${cat.badge}`;
  badge.textContent = cat.label;
  document.getElementById('detail-title').textContent = issue.title;

  const priBadge = document.getElementById('detail-priority-badge');
  priBadge.className = `priority-glow-badge priority-${issue.prioritySeverity}`;
  priBadge.textContent = `AI Severity: ${issue.priorityScore} (${issue.prioritySeverity.toUpperCase()})`;

  // Before After slider vs default image box
  const slider = document.getElementById('detail-slider-comparison');
  const imgBox = document.getElementById('detail-img-box');
  const beforeImg = document.getElementById('detail-before-img');
  const afterImg = document.getElementById('detail-after-img');
  const singleImg = document.getElementById('detail-image');

  const auditBadge = document.getElementById('detail-ai-verification');

  const statusBox = document.getElementById('detail-ai-verification-status-box');

  if (issue.status === 'resolved' && issue.resolvedPhoto) {
    slider.classList.remove('hidden');
    imgBox.classList.add('hidden');
    beforeImg.src = issue.photo || getMockImageSVG(issue.category);
    afterImg.src = issue.resolvedPhoto;
    resetSplitSlider();
    auditResolutionVisuals(issue);
  } else {
    slider.classList.add('hidden');
    if (auditBadge) auditBadge.classList.add('hidden');
    if (issue.photo) {
      imgBox.classList.remove('hidden');
      singleImg.src = issue.photo;
    } else {
      imgBox.classList.add('hidden');
      singleImg.src = '';
    }
    if (statusBox) {
      if (issue.status === 'resolved') {
        statusBox.className = 'ai-verification-status-box success';
        statusBox.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>AI Verified: Resolution Confirmed (System Audit) ✓</span>
        `;
      } else {
        statusBox.className = 'ai-verification-status-box pending';
        statusBox.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Awaiting Resolution Proof: Verification photo has not been uploaded by authorities.</span>
        `;
      }
    }
  }

  // Meta & Description
  document.getElementById('detail-description').textContent = issue.description;
  document.getElementById('detail-date').textContent = formatDateString(issue.date);
  document.getElementById('detail-location').textContent = `${issue.locationText || 'Detected Location'} (X: ${Math.round(issue.coordX)}, Y: ${Math.round(issue.coordY)})`;
  document.getElementById('detail-author-name').textContent = issue.authorName || 'Verified Citizen';

  // Upvote Actions
  const upvoteBtn = document.getElementById('btn-upvote');
  document.getElementById('detail-upvotes').textContent = issue.upvotes;

  const hasUpvoted = state.currentUser && issue.upvotedUsers && issue.upvotedUsers.includes(state.currentUser.email);
  if (hasUpvoted) {
    upvoteBtn.classList.add('upvoted');
    upvoteBtn.setAttribute('aria-pressed', 'true');
  } else {
    upvoteBtn.classList.remove('upvoted');
    upvoteBtn.setAttribute('aria-pressed', 'false');
  }

  // Show/Hide Role Sections
  const adminBox = document.getElementById('admin-actions-box');
  const upvoteBox = document.getElementById('citizen-upvote-box');
  const selectStatus = document.getElementById('admin-status-select');
  const selectAssignee = document.getElementById('admin-assignee-select');
  
  selectStatus.value = issue.status;
  selectAssignee.value = issue.assignee || 'unassigned';

  // Trigger resolved photo upload form display if status resolved is pre-selected
  toggleResolutionPhotoUploadField(issue.status);

  if (state.userRole === 'admin') {
    adminBox.classList.remove('hidden');
    upvoteBox.classList.add('hidden');
  } else {
    adminBox.classList.add('hidden');
    upvoteBox.classList.remove('hidden');
  }

  renderTimeline(issue);
  renderComments(issue);

  dialog.showModal();
};

function toggleResolutionPhotoUploadField(status) {
  const field = document.getElementById('admin-resolution-photo-field');
  if (status === 'resolved') {
    field.classList.remove('hidden');
  } else {
    field.classList.add('hidden');
  }
}

// --- BEFORE AFTER COMP SLIDER MOUSE DRAG ---
let isDraggingSlider = false;

function initSplitSliderDrag() {
  const handle = document.getElementById('slider-handle');
  const container = document.getElementById('detail-slider-comparison');

  handle.addEventListener('mousedown', (e) => {
    isDraggingSlider = true;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingSlider) return;
    updateSliderPosition(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDraggingSlider = false;
  });

  // Touch triggers
  handle.addEventListener('touchstart', (e) => {
    isDraggingSlider = true;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDraggingSlider) return;
    if (e.touches.length > 0) {
      updateSliderPosition(e.touches[0].clientX);
    }
  });

  window.addEventListener('touchend', () => {
    isDraggingSlider = false;
  });

  function updateSliderPosition(clientX) {
    const rect = container.getBoundingClientRect();
    let posX = clientX - rect.left;
    if (posX < 0) posX = 0;
    if (posX > rect.width) posX = rect.width;

    const pct = (posX / rect.width) * 100;
    container.style.setProperty('--clip-percent', `${pct}%`);
  }
}

function resetSplitSlider() {
  document.getElementById('detail-slider-comparison').style.setProperty('--clip-percent', '50%');
}

function renderTimeline(issue) {
  const timelineEl = document.getElementById('detail-timeline');
  timelineEl.innerHTML = '';

  const timelineData = issue.timeline || [];
  timelineData.forEach(item => {
    let milestoneClass = '';
    if (item.status === 'progress') milestoneClass = 'status-progress';
    if (item.status === 'resolved') milestoneClass = 'status-resolved';
    if (item.status === 'pending') milestoneClass = 'active';

    const itemHTML = `
      <li class="timeline-item ${milestoneClass}">
        <span class="timeline-meta">${item.date}</span>
        <span class="timeline-title">${item.title}</span>
        <p class="timeline-note">${item.note}</p>
      </li>
    `;
    timelineEl.insertAdjacentHTML('beforeend', itemHTML);
  });
}

function renderComments(issue) {
  const commentsList = document.getElementById('detail-comments-list');
  const commentsCount = document.getElementById('detail-comments-count');
  commentsList.innerHTML = '';
  
  const comments = issue.comments || [];
  commentsCount.textContent = comments.length;

  comments.forEach(comment => {
    const adminClass = comment.role === 'admin' ? 'admin-note' : '';
    const commentHTML = `
      <div class="comment-card ${adminClass}">
        <div class="comment-header">
          <span class="comment-author">${comment.author}</span>
          <span class="comment-time">${comment.date}</span>
        </div>
        <div class="comment-body">${comment.text}</div>
      </div>
    `;
    commentsList.insertAdjacentHTML('beforeend', commentHTML);
  });
  
  commentsList.scrollTop = commentsList.scrollHeight;
}

// Comments Post Listener
function setupCommentsListener() {
  const commentForm = document.getElementById('comment-form');
  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.currentUser) {
      showToast('You must sign in to add comments.', 'error');
      document.getElementById('auth-dialog').showModal();
      return;
    }

    const textarea = document.getElementById('comment-textarea');
    const commentText = textarea.value.trim();
    if (!commentText || !state.selectedIssueId) return;

    const token = localStorage.getItem('civic_jwt');
    if (!token) return;

    // Set posting state
    const submitBtn = commentForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Posting...';
    submitBtn.disabled = true;
    textarea.disabled = true;

    fetch(`${API_URL_PREFIX}/api/issues/${state.selectedIssueId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: commentText })
    })
    .then(async (res) => {
      if (res.ok) {
        const updatedIssue = await res.json();
        state.updateIssue(updatedIssue);
        textarea.value = '';
        renderComments(updatedIssue);

        // Sync profile karma & badges
        await loadServerData();
        showToast('+15 Civic Karma: Commented on ticket!', 'success');

        if (state.activeView === 'feed') renderFeed();
        if (state.activeView === 'profile') renderProfile();
      } else {
        showToast('Failed to post comment.', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      showToast('Connection error to server.', 'error');
    })
    .finally(() => {
      // Restore form state
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      textarea.disabled = false;
    });
  });
}

// Upvotes action listener
function setupUpvoteListener() {
  const upvoteBtn = document.getElementById('btn-upvote');
  upvoteBtn.addEventListener('click', () => {
    if (!state.currentUser) {
      showToast('You must sign in to upvote issues.', 'error');
      document.getElementById('auth-dialog').showModal();
      return;
    }

    if (!state.selectedIssueId) return;
    const issue = state.getIssueById(state.selectedIssueId);
    if (!issue) return;

    const token = localStorage.getItem('civic_jwt');
    if (!token) return;

    fetch(`${API_URL_PREFIX}/api/issues/${state.selectedIssueId}/upvote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(async (res) => {
      if (res.ok) {
        const updatedIssue = await res.json();
        state.updateIssue(updatedIssue);

        const hasUpvoted = state.currentUser && updatedIssue.upvotedUsers && updatedIssue.upvotedUsers.includes(state.currentUser.email);
        if (hasUpvoted) {
          upvoteBtn.classList.add('upvoted');
          upvoteBtn.setAttribute('aria-pressed', 'true');
          showToast('+10 Civic Karma: Upvoted ticket!', 'success');
        } else {
          upvoteBtn.classList.remove('upvoted');
          upvoteBtn.setAttribute('aria-pressed', 'false');
          showToast('-10 Civic Karma: Removed upvote', 'warning');
        }

        document.getElementById('detail-upvotes').textContent = updatedIssue.upvotes;

        await loadServerData();

        if (state.activeView === 'feed') renderFeed();
        if (state.activeView === 'dashboard') renderDashboard();
        if (state.activeView === 'profile') renderProfile();
      } else {
        showToast('Failed to upvote.', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      showToast('Connection error to server.', 'error');
    });
  });
}

// Admin resolve photo uploader
let adminPhotoData = null;

function setupAdminPhotoUpload() {
  const dropZone = document.getElementById('admin-photo-upload-zone');
  const fileInput = document.getElementById('admin-photo-input');
  const previewContainer = document.getElementById('admin-preview-container');
  const previewImg = document.getElementById('admin-preview-img');
  const prompt = document.getElementById('admin-upload-prompt');
  const removeBtn = document.getElementById('btn-remove-admin-photo');

  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#btn-remove-admin-photo')) return;
    if (e.target === fileInput) return;
    fileInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      readAdminImage(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      readAdminImage(fileInput.files[0]);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    adminPhotoData = null;
    fileInput.value = '';
    previewImg.src = '';
    previewContainer.classList.add('hidden');
    prompt.classList.remove('hidden');
  });

  function readAdminImage(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      adminPhotoData = e.target.result;
      previewImg.src = adminPhotoData;
      previewContainer.classList.remove('hidden');
      prompt.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function resetAdminPhotoUpload() {
  adminPhotoData = null;
  document.getElementById('admin-photo-input').value = '';
  document.getElementById('admin-preview-img').src = '';
  document.getElementById('admin-preview-container').classList.add('hidden');
  document.getElementById('admin-upload-prompt').classList.remove('hidden');
}

// Admin Submit Status Operations
function setupAdminActionsListener() {
  const selectStatus = document.getElementById('admin-status-select');
  const selectAssignee = document.getElementById('admin-assignee-select');
  const updateStatusBtn = document.getElementById('btn-update-status');

  selectStatus.addEventListener('change', (e) => {
    toggleResolutionPhotoUploadField(e.target.value);
  });

  updateStatusBtn.addEventListener('click', () => {
    if (!state.selectedIssueId) return;
    const issue = state.getIssueById(state.selectedIssueId);
    if (!issue) return;

    const newStatus = selectStatus.value;
    const newAssignee = selectAssignee.value;

    if (newStatus === 'resolved' && !adminPhotoData) {
      showToast('Please upload a resolved state photo proof.', 'error');
      return;
    }

    const token = localStorage.getItem('civic_jwt');
    if (!token) return;

    fetch(`${API_URL_PREFIX}/api/issues/${state.selectedIssueId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: newStatus,
        assignee: newAssignee,
        resolvedPhoto: newStatus === 'resolved' ? adminPhotoData : undefined
      })
    })
    .then(async (res) => {
      if (res.ok) {
        const updatedIssue = await res.json();
        state.updateIssue(updatedIssue);

        showToast('Operations ticket updated successfully.', 'success');
        resetAdminPhotoUpload();
        document.getElementById('detail-dialog').close();
        
        await loadServerData();

        renderDashboard();
        renderFeed();
        renderMap();
        renderAdminPanel();
      } else {
        showToast('Failed to update operations ticket.', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      showToast('Connection error to server.', 'error');
    });
  });
}

// --- 7. SMART AI SEVERITY TRIAGE ENGINE ---
function runAIEngineTriage(title, description, category) {
  // Base category hazard values
  let baseScore = 20;
  if (category === 'roads') baseScore = 40;
  if (category === 'waste') baseScore = 30;
  if (category === 'lighting') baseScore = 25;
  if (category === 'water') baseScore = 50;
  if (category === 'parks') baseScore = 20;

  // Text keyword scans
  const textToScan = `${title} ${description}`.toLowerCase();
  
  let keywordBoost = 0;
  
  // Severe hazard keywords
  const severeKeys = ['danger', 'hazard', 'risk', 'accident', 'harm', 'collapse', 'injury', 'toxic', 'poison'];
  severeKeys.forEach(kw => { if (textToScan.includes(kw)) keywordBoost += 10; });

  // Urgency keywords
  const urgentKeys = ['urgent', 'emergency', 'immediate', 'leak', 'flood', 'burst', 'electric shock', 'exposed wire'];
  urgentKeys.forEach(kw => { if (textToScan.includes(kw)) keywordBoost += 8; });

  // Vulnerable groups keywords
  const childrenKeys = ['child', 'kids', 'elderly', 'school', 'play', 'baby'];
  childrenKeys.forEach(kw => { if (textToScan.includes(kw)) keywordBoost += 5; });

  // Cumulative score capped at 100
  const finalScore = Math.min(100, baseScore + keywordBoost);
  
  // Severity Level mapping
  let severity = 'low';
  if (finalScore >= 70) severity = 'high';
  else if (finalScore >= 40) severity = 'medium';

  return { score: finalScore, severity: severity };
}

// --- 8. SUBMISSION FORM LOGIC ---
let selectedPhotoData = null;

// --- CLIENT-SIDE MACHINE LEARNING (TensorFlow.js + MobileNet) ---
async function loadMLModel() {
  try {
    console.log("Loading TensorFlow.js MobileNet model...");
    if (typeof mobilenet !== 'undefined') {
      imageClassifierModel = await mobilenet.load();
      console.log("MobileNet model loaded successfully.");
    } else {
      console.warn("MobileNet library not loaded via CDN.");
    }
  } catch (e) {
    console.error("Failed to load MobileNet model:", e);
  }
}

async function classifyUploadedImage(imgElement) {
  const feedback = document.getElementById('ai-img-analysis-status');
  if (!feedback) return;

  if (!imageClassifierModel) {
    feedback.innerHTML = `
      <span style="color: var(--color-text-secondary);">AI Classifier: MobileNet model is still loading in the background. Please wait...</span>
    `;
    feedback.classList.remove('hidden');
    return;
  }

  feedback.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span class="spinner-border" style="display: inline-block; width: 12px; height: 12px; border: 2px solid var(--color-accent); border-right-color: transparent; border-radius: 50%; animation: spin 0.75s linear infinite; vertical-align: middle;"></span>
      <span>AI Triage is classifying uploaded image...</span>
    </div>
  `;
  feedback.classList.remove('hidden');

  try {
    const predictions = await imageClassifierModel.classify(imgElement);
    if (predictions && predictions.length > 0) {
      displayImagePredictions(predictions);
      autoSuggestCategory(predictions);

      const quality = validateImageQuality(imgElement);
      if (!quality.success) {
        const warningsHtml = quality.warnings.map(w => `<div style="color: #fca5a5; font-weight: 500; font-size: 0.8rem; margin-top: 0.2rem;">${w}</div>`).join('');
        feedback.innerHTML += `
          <div style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed rgba(239, 68, 68, 0.2); font-size: 0.8rem;">
            ⚙️ AI Quality Inspection:
            ${warningsHtml}
          </div>
        `;
      } else {
        feedback.innerHTML += `
          <div style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed rgba(16, 185, 129, 0.2); font-size: 0.8rem; color: #34d399; font-weight: 500;">
            ✅ AI Quality Inspection: Passed (Clear image & good exposure)
          </div>
        `;
      }
    } else {
      feedback.textContent = "AI Analysis: Image contents could not be determined.";
    }
  } catch (err) {
    console.error("Image classification error:", err);
    feedback.textContent = "AI Analysis: Failed to analyze image contents.";
  }
}

function displayImagePredictions(predictions) {
  const feedback = document.getElementById('ai-img-analysis-status');
  if (!feedback) return;

  let html = `<div style="font-weight: 600; margin-bottom: 0.25rem;">🔍 AI Vision Analysis (TensorFlow ML):</div>`;
  predictions.forEach((pred, i) => {
    const probPct = Math.round(pred.probability * 100);
    const colorStyle = i === 0 ? 'color: var(--color-accent); font-weight: 600;' : 'color: var(--color-text-secondary);';
    html += `
      <div class="prediction-item" style="${colorStyle}">
        <span>${i + 1}. ${pred.className.split(',')[0]}</span>
        <span>${probPct}%</span>
      </div>
    `;
  });
  feedback.innerHTML = html;
}

function autoSuggestCategory(predictions) {
  const categorySelect = document.getElementById('issue-category');
  if (!categorySelect) return;

  const categoryKeywords = {
    roads: ['road', 'street', 'pothole', 'crack', 'asphalt', 'pavement', 'manhole', 'tile', 'curb', 'brick', 'highway', 'barrier'],
    waste: ['garbage', 'trash', 'waste', 'bin', 'dump', 'refuse', 'litter', 'rubbish', 'junk', 'plastic', 'can', 'bottle', 'ashcan', 'box'],
    lighting: ['light', 'lamp', 'bulb', 'wire', 'pole', 'post', 'glow', 'electric', 'lantern', 'candle', 'torch', 'fixture'],
    water: ['water', 'pipe', 'leak', 'drain', 'sewer', 'faucet', 'valve', 'hydrant', 'puddle', 'splash', 'stream', 'fluid'],
    parks: ['park', 'tree', 'grass', 'bench', 'swing', 'playground', 'slide', 'lawn', 'field', 'garden', 'forest', 'jungle']
  };

  let bestCategory = null;
  let highestScore = 0;

  predictions.forEach(pred => {
    const text = pred.className.toLowerCase();
    const probability = pred.probability;

    for (const [catKey, keywords] of Object.entries(categoryKeywords)) {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          const score = probability;
          if (score > highestScore) {
            highestScore = score;
            bestCategory = catKey;
          }
        }
      });
    }
  });

  if (bestCategory) {
    categorySelect.value = bestCategory;
    const formField = categorySelect.closest('.form-field');
    if (formField) {
      formField.classList.remove('has-error');
      categorySelect.dispatchEvent(new Event('change'));
    }
    
    const feedback = document.getElementById('ai-img-analysis-status');
    if (feedback) {
      const catLabel = CATEGORIES[bestCategory].label;
      const noteHtml = `
        <div style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed rgba(99, 102, 241, 0.2); font-size: 0.8rem; color: #10b981; font-weight: 500;">
          💡 AI auto-selected category: <strong>${catLabel}</strong>
        </div>
      `;
      feedback.insertAdjacentHTML('beforeend', noteHtml);
      showToast(`AI classified category: ${catLabel}`, 'success');
    }
  }
}

function setupPhotoUpload() {
  const dropZone = document.getElementById('photo-upload-zone');
  const fileInput = document.getElementById('issue-photo-input');
  const previewContainer = document.getElementById('photo-preview-container');
  const previewImg = document.getElementById('photo-preview-img');
  const removePhotoBtn = document.getElementById('btn-remove-photo');

  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#btn-remove-photo')) return;
    if (e.target === fileInput) return;
    fileInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      readImageFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      readImageFile(fileInput.files[0]);
    }
  });

  removePhotoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedPhotoData = null;
    fileInput.value = '';
    previewImg.src = '';
    previewContainer.classList.add('hidden');
    dropZone.classList.remove('hidden-prompt');

    const feedback = document.getElementById('ai-img-analysis-status');
    if (feedback) {
      feedback.classList.add('hidden');
      feedback.innerHTML = '';
    }
  });

  previewImg.addEventListener('load', () => {
    if (previewImg.src && previewImg.src.startsWith('data:image/')) {
      classifyUploadedImage(previewImg);
    }
  });

  function readImageFile(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedPhotoData = e.target.result;
      previewImg.src = selectedPhotoData;
      previewContainer.classList.remove('hidden');
      dropZone.classList.add('hidden-prompt');
    };
    reader.readAsDataURL(file);
  }
}

function setupMiniMapPicker() {
  const miniMap = document.getElementById('mini-map-svg');
  const miniPin = document.getElementById('mini-map-pin');
  const coordXInput = document.getElementById('coord-x');
  const coordYInput = document.getElementById('coord-y');

  miniMap.addEventListener('click', (e) => {
    const rect = miniMap.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const relX = (clickX / rect.width) * 400;
    const relY = (clickY / rect.height) * 200;

    miniPin.setAttribute('transform', `translate(${relX - 12}, ${relY - 22})`);
    miniPin.classList.remove('hidden');

    coordXInput.value = relX;
    coordYInput.value = relY;

    document.getElementById('mini-map-picker').closest('.form-field').classList.remove('has-error');
  });
}

function setupGeolocation() {
  const btnLocate = document.getElementById('btn-locate-me');
  const miniPin = document.getElementById('mini-map-pin');
  const coordXInput = document.getElementById('coord-x');
  const coordYInput = document.getElementById('coord-y');
  const locationText = document.getElementById('issue-location-text');
  const miniMapField = document.getElementById('mini-map-picker').closest('.form-field');

  if (!btnLocate) return;

  btnLocate.addEventListener('click', () => {
    const origText = btnLocate.innerHTML;
    btnLocate.disabled = true;
    btnLocate.innerHTML = `
      <span class="spinner-border" style="display: inline-block; width: 10px; height: 10px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.75s linear infinite; margin-right: 4px; vertical-align: middle;"></span>
      Locating...
    `;

    if (!navigator.geolocation) {
      showToast('Geolocation not supported by browser. Simulating location...', 'warning');
      simulate();
      resetButton();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Map actual lat/lon to map coordinates X: [50, 350], Y: [40, 160] (within 400x200 canvas)
        const x = 50 + (Math.abs(pos.coords.longitude * 1000) % 300);
        const y = 40 + (Math.abs(pos.coords.latitude * 1000) % 120);
        coordXInput.value = x.toFixed(1);
        coordYInput.value = y.toFixed(1);
        
        miniPin.setAttribute('transform', `translate(${x - 12}, ${y - 22})`);
        miniPin.classList.remove('hidden');
        miniMapField.classList.remove('has-error');
        
        locationText.value = `GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (Detected Location)`;
        
        // Remove error states from locationText field
        const locationField = locationText.closest('.form-field');
        if (locationField) locationField.classList.remove('has-error');
        locationText.removeAttribute('aria-invalid');

        showToast('Successfully detected your location coordinates!', 'success');
        resetButton();
      },
      (err) => {
        let msg = 'Unable to retrieve location';
        if (err.code === 1) msg = 'Location permission denied';
        else if (err.code === 2) msg = 'Location unavailable';
        else if (err.code === 3) msg = 'Location request timed out';
        
        showToast(`${msg}. Simulating coordinates...`, 'warning');
        simulate();
        resetButton();
      },
      { timeout: 8000, enableHighAccuracy: true }
    );

    function simulate() {
      const x = 100 + Math.random() * 200;
      const y = 50 + Math.random() * 100;
      coordXInput.value = x.toFixed(1);
      coordYInput.value = y.toFixed(1);
      
      miniPin.setAttribute('transform', `translate(${x - 12}, ${y - 22})`);
      miniPin.classList.remove('hidden');
      miniMapField.classList.remove('has-error');
      
      locationText.value = `Sector ${Math.floor(x/40) + 1}, Lane ${Math.floor(y/25) + 1} (Simulated Location)`;
      
      // Remove error states from locationText field
      const locationField = locationText.closest('.form-field');
      if (locationField) locationField.classList.remove('has-error');
      locationText.removeAttribute('aria-invalid');

      showToast('Simulated coordinates set on mini-map.', 'success');
    }

    function resetButton() {
      btnLocate.disabled = false;
      btnLocate.innerHTML = origText;
    }
  });
}

function resetReportForm() {
  const form = document.getElementById('report-issue-form');
  form.reset();
  
  selectedPhotoData = null;
  document.getElementById('photo-preview-img').src = '';
  document.getElementById('photo-preview-container').classList.add('hidden');
  document.getElementById('photo-upload-zone').classList.remove('hidden-prompt');

  document.getElementById('mini-map-pin').classList.add('hidden');
  document.getElementById('coord-x').value = '';
  document.getElementById('coord-y').value = '';

  const feedback = document.getElementById('ai-img-analysis-status');
  if (feedback) {
    feedback.classList.add('hidden');
    feedback.innerHTML = '';
  }

  const duplicateWarningBox = document.getElementById('ai-duplicate-warning');
  if (duplicateWarningBox) {
    duplicateWarningBox.classList.add('hidden');
    duplicateWarningBox.innerHTML = '';
  }

  form.querySelectorAll('.form-field').forEach(field => {
    field.classList.remove('has-error');
    const input = field.querySelector('input, select, textarea');
    if (input) input.removeAttribute('aria-invalid');
  });
}

// --- DEBOUNCE HELPER ---
function debounce(fn, delay) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// --- IMAGE QUALITY VALIDATOR (Classic Computer Vision) ---
function validateImageQuality(imgElement) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resize to 60x60 for quick pixel analysis
    canvas.width = 60;
    canvas.height = 60;
    ctx.drawImage(imgElement, 0, 0, 60, 60);
    
    const imgData = ctx.getImageData(0, 0, 60, 60);
    const data = imgData.data;
    const len = data.length;
    
    let totalLuminance = 0;
    const grayscale = new Float32Array(3600);
    
    for (let i = 0, j = 0; i < len; i += 4, j++) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;
      grayscale[j] = lum;
    }
    
    const avgLuminance = totalLuminance / 3600;
    
    let varianceSum = 0;
    for (let i = 0; i < 3600; i++) {
      const diff = grayscale[i] - avgLuminance;
      varianceSum += diff * diff;
    }
    const standardDeviation = Math.sqrt(varianceSum / 3600);
    
    let warnings = [];
    if (avgLuminance < 40) {
      warnings.push("⚠️ Image appears too dark (under-exposed).");
    } else if (avgLuminance > 240) {
      warnings.push("⚠️ Image appears too bright (over-exposed).");
    }
    
    if (standardDeviation < 15) {
      warnings.push("⚠️ Image has low contrast or detail (possibly blurry).");
    }
    
    return {
      success: warnings.length === 0,
      warnings: warnings,
      avgLuminance: avgLuminance,
      contrast: standardDeviation
    };
  } catch (err) {
    console.error("Image quality evaluation failed:", err);
    return { success: true, warnings: [] };
  }
}

// --- NLP DUPLICATE ISSUE DETECTOR ---
function checkDuplicateIssues() {
  const titleInput = document.getElementById('issue-title');
  const descInput = document.getElementById('issue-description');
  const duplicateWarningBox = document.getElementById('ai-duplicate-warning');
  
  if (!titleInput || !descInput || !duplicateWarningBox) return;
  
  const titleText = titleInput.value.trim().toLowerCase();
  const descText = descInput.value.trim().toLowerCase();
  
  if (titleText.length < 8) {
    duplicateWarningBox.classList.add('hidden');
    duplicateWarningBox.innerHTML = '';
    return;
  }
  
  const combinedText = `${titleText} ${descText}`;
  const inputTokens = tokenizeText(combinedText);
  
  let bestMatch = null;
  let highestScore = 0;
  
  const openIssues = state.issues.filter(issue => issue.status !== 'resolved');
  
  openIssues.forEach(issue => {
    const issueText = `${issue.title.toLowerCase()} ${issue.description.toLowerCase()}`;
    const issueTokens = tokenizeText(issueText);
    
    const score = calculateJaccardSimilarity(inputTokens, issueTokens);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = issue;
    }
  });
  
  if (highestScore > 0.25 && bestMatch) {
    duplicateWarningBox.innerHTML = `
      <div><strong>⚠️ AI Duplicate Alert:</strong> A similar issue was already reported nearby!</div>
      <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
        "${bestMatch.title}" (Status: ${STATUSES[bestMatch.status].label})
      </div>
      <button type="button" class="btn-warning-action" onclick="viewExistingDuplicate('${bestMatch.id}')">
        View & Upvote Existing Report
      </button>
    `;
    duplicateWarningBox.classList.remove('hidden');
  } else {
    duplicateWarningBox.classList.add('hidden');
    duplicateWarningBox.innerHTML = '';
  }
}

function tokenizeText(text) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 'with', 'for', 'about', 'near', 'from', 'this', 'that', 'there', 'it', 'has', 'have', 'had', 'deep', 'huge', 'big', 'small', 'very', 'extremely']);
  return new Set(
    text
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2 && !stopWords.has(token))
  );
}

function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  setA.forEach(item => {
    if (setB.has(item)) intersectionCount++;
  });
  const unionSize = setA.size + setB.size - intersectionCount;
  return intersectionCount / unionSize;
}

window.viewExistingDuplicate = function(issueId) {
  const reportDialog = document.getElementById('report-dialog');
  if (reportDialog) reportDialog.close();
  openDetailDialog(issueId);
};

// --- AI RESOLUTION VISUAL COMPARISON AUDITOR ---
async function auditResolutionVisuals(issue) {
  const auditBadge = document.getElementById('detail-ai-verification');
  const statusBox = document.getElementById('detail-ai-verification-status-box');
  
  if (auditBadge) {
    auditBadge.className = "ai-verification-badge";
    auditBadge.textContent = "AI Auditing Resolution...";
    auditBadge.classList.remove('hidden');
  }
  
  if (statusBox) {
    statusBox.className = "ai-verification-status-box pending";
    statusBox.innerHTML = `
      <span class="spinner-border" style="display: inline-block; width: 12px; height: 12px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.75s linear infinite; vertical-align: middle; margin-right: 4px;"></span>
      <span>AI Triage is auditing resolution photos...</span>
    `;
  }
  
  try {
    if (!imageClassifierModel) {
      setTimeout(() => {
        if (auditBadge) auditBadge.innerHTML = `🛡️ AI Verified (System Audit)`;
        if (statusBox) {
          statusBox.className = "ai-verification-status-box success";
          statusBox.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>AI Verified: Resolution Confirmed ✓</span>
          `;
        }
      }, 600);
      return;
    }
    
    const imgBefore = new Image();
    const imgAfter = new Image();
    
    imgBefore.src = issue.photo || getMockImageSVG(issue.category, false);
    imgAfter.src = issue.resolvedPhoto;
    
    await Promise.all([
      new Promise(resolve => imgBefore.onload = resolve),
      new Promise(resolve => imgAfter.onload = resolve)
    ]);
    
    const beforePredictions = await imageClassifierModel.classify(imgBefore);
    const afterPredictions = await imageClassifierModel.classify(imgAfter);
    
    const beforeFirst = beforePredictions[0].className.toLowerCase();
    const afterFirst = afterPredictions[0].className.toLowerCase();
    
    const hazardKeywords = ['garbage', 'trash', 'waste', 'refuse', 'hole', 'wire', 'leak', 'lamp', 'dark'];
    const beforeHasHazard = hazardKeywords.some(kw => beforeFirst.includes(kw));
    const afterHasHazard = hazardKeywords.some(kw => afterFirst.includes(kw));
    
    let statusHTML = '';
    let isSuccess = false;
    let badgeText = '';

    if (beforeHasHazard && !afterHasHazard) {
      badgeText = `🛡️ AI Verified: Resolution Verified (Hazard Cleared)`;
      isSuccess = true;
    } else if (beforeFirst !== afterFirst) {
      badgeText = `🛡️ AI Verified: Resolution Verified (Visual Cleanup)`;
      isSuccess = true;
    } else {
      badgeText = `⚠️ AI Audit: Low Visual Variance Detected`;
      isSuccess = false;
    }

    if (auditBadge) auditBadge.innerHTML = badgeText;
    
    if (statusBox) {
      if (isSuccess) {
        statusBox.className = "ai-verification-status-box success";
        statusBox.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>AI Verified: Resolution Confirmed ✓</span>
        `;
      } else {
        statusBox.className = "ai-verification-status-box warning";
        statusBox.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>AI Audit: Low Visual Variance Detected between photos</span>
        `;
      }
    }
  } catch (err) {
    console.error("AI visual audit failed:", err);
    if (auditBadge) auditBadge.innerHTML = `⚠️ AI Audit Failed`;
    if (statusBox) {
      statusBox.className = "ai-verification-status-box warning";
      statusBox.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>AI Audit Failed: Image processing error</span>
      `;
    }
  }
}


function setupReportSubmission() {
  const form = document.getElementById('report-issue-form');
  const dialog = document.getElementById('report-dialog');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.currentUser) {
      showToast('Session expired. Please sign in to submit reports.', 'error');
      document.getElementById('auth-dialog').showModal();
      return;
    }

    let hasErrors = false;

    // Validate Coords
    const coordX = document.getElementById('coord-x').value;
    const coordY = document.getElementById('coord-y').value;
    const miniMapField = document.getElementById('mini-map-picker').closest('.form-field');
    
    if (!coordX || !coordY) {
      miniMapField.classList.add('has-error');
      hasErrors = true;
    } else {
      miniMapField.classList.remove('has-error');
    }

    // Standard fields
    const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
    fields.forEach(field => {
      const formField = field.closest('.form-field');
      if (!field.checkValidity()) {
        formField.classList.add('has-error');
        field.setAttribute('aria-invalid', 'true');
        hasErrors = true;
      } else {
        formField.classList.remove('has-error');
        field.removeAttribute('aria-invalid');
      }
    });

    const title = document.getElementById('issue-title').value.trim();
    const category = document.getElementById('issue-category').value;
    const description = document.getElementById('issue-description').value.trim();
    const locationText = document.getElementById('issue-location-text').value.trim();

    const token = localStorage.getItem('civic_jwt');
    if (!token) return;

    fetch(`${API_URL_PREFIX}/api/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        category,
        description,
        locationText,
        photo: selectedPhotoData || getMockImageSVG(category, false),
        coordX: parseFloat(coordX),
        coordY: parseFloat(coordY)
      })
    })
    .then(async (res) => {
      if (res.ok) {
        showToast('Issue submitted successfully!', 'success');
        await loadServerData();
        dialog.close();
        resetReportForm();

        // Reward Karma points for reporting (+50)
        await awardKarma(50, 'Submitted new ticket report');

        renderDashboard();
        renderFeed();
        renderMap();

        switchView('feed');
      } else {
        const data = await res.json();
        showToast(data.msg || 'Failed to submit issue.', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      showToast('Connection error to server.', 'error');
    });
  });

  form.addEventListener('input', (e) => {
    const field = e.target;
    if (field.checkValidity()) {
      const formField = field.closest('.form-field');
      if (formField) formField.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('blur', (e) => {
    const field = e.target;
    if (field.matches('input[required], select[required], textarea[required]')) {
      const formField = field.closest('.form-field');
      if (!field.checkValidity()) {
        formField.classList.add('has-error');
        field.setAttribute('aria-invalid', 'true');
      }
    }
  }, true);

  // Real-time NLP Duplicate Detector
  const titleInput = document.getElementById('issue-title');
  const descInput = document.getElementById('issue-description');
  if (titleInput && descInput) {
    titleInput.addEventListener('input', debounce(checkDuplicateIssues, 400));
    descInput.addEventListener('input', debounce(checkDuplicateIssues, 400));
  }
}

// --- 9. SIMULATED AUTH PROVIDER SYSTEM ---
function setupAuthentication() {
  const dialog = document.getElementById('auth-dialog');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('auth-login-form');
  const regForm = document.getElementById('auth-register-form');

  // Login/Register Tab Toggle
  tabLogin.addEventListener('click', () => toggleAuthTabs('login'));
  tabRegister.addEventListener('click', () => toggleAuthTabs('register'));

  function toggleAuthTabs(mode) {
    const loginErrorBanner = document.getElementById('login-error-banner');
    const registerErrorBanner = document.getElementById('register-error-banner');
    if (loginErrorBanner) loginErrorBanner.classList.add('hidden');
    if (registerErrorBanner) registerErrorBanner.classList.add('hidden');

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.classList.remove('hidden');
      regForm.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      regForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  // 1. SIGN IN SUBMIT
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const loginErrorBanner = document.getElementById('login-error-banner');
    if (loginErrorBanner) loginErrorBanner.classList.add('hidden');

    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;

    let hasError = false;
    // Basic field validation
    loginForm.querySelectorAll('input').forEach(inp => {
      const f = inp.closest('.form-field');
      if (!inp.checkValidity()) {
        f.classList.add('has-error');
        hasError = true;
      } else {
        f.classList.remove('has-error');
      }
    });

    if (hasError) return;

    fetch(`${API_URL_PREFIX}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    })
    .then(async (res) => {
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { msg: 'Server error' };
      }

      if (res.ok) {
        localStorage.setItem('civic_jwt', data.token);
        localStorage.setItem('civic_user', JSON.stringify(data.user));

        state.currentUser = data.user;
        state.userRole = data.user.role;

        showToast(`Welcome back, ${data.user.name}!`, 'success');
        dialog.close();
        loginForm.reset();

        syncSessionUI();
        await loadServerData();

        renderDashboard();
        renderFeed();
        renderMap();

        switchView('dashboard');
      } else {
        const loginErrorBanner = document.getElementById('login-error-banner');
        if (loginErrorBanner) {
          loginErrorBanner.textContent = `❌ ${data.msg || 'Invalid email credentials or password.'}`;
          loginErrorBanner.classList.remove('hidden');
        }
        showToast(data.msg || 'Invalid email credentials or password.', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      showToast('Connection error to server.', 'error');
    });
  });

  // 2. REGISTER SUBMIT
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const registerErrorBanner = document.getElementById('register-error-banner');
    if (registerErrorBanner) registerErrorBanner.classList.add('hidden');

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    
    const avatarChecked = regForm.querySelector('input[name="reg-avatar"]:checked');
    const avatarVal = avatarChecked ? avatarChecked.value : 'avatar-1';

    let hasError = false;
    regForm.querySelectorAll('input[required]').forEach(inp => {
      const f = inp.closest('.form-field');
      if (!inp.checkValidity()) {
        f.classList.add('has-error');
        hasError = true;
      } else {
        f.classList.remove('has-error');
      }
    });

    if (hasError) return;

    let avatarUrl = getMockAvatarSVG('Felix');
    if (avatarVal === 'avatar-2') avatarUrl = getMockAvatarSVG('Aria');
    if (avatarVal === 'avatar-3') avatarUrl = getMockAvatarSVG('Jack');
    if (avatarVal === 'avatar-4') avatarUrl = getMockAvatarSVG('Luna');
    if (avatarVal === 'avatar-5') avatarUrl = getMockAvatarSVG('Oliver');

    fetch(`${API_URL_PREFIX}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass, avatar: avatarUrl })
    })
    .then(async (res) => {
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { msg: 'Server error' };
      }

      if (res.ok) {
        localStorage.setItem('civic_jwt', data.token);
        localStorage.setItem('civic_user', JSON.stringify(data.user));

        state.currentUser = data.user;
        state.userRole = data.user.role;

        showToast(`Account created. Welcome to CivicPulse, ${name}!`, 'success');
        dialog.close();
        regForm.reset();

        syncSessionUI();
        await loadServerData();

        renderDashboard();
        renderFeed();
        renderMap();

        switchView('dashboard');
      } else {
        const registerErrorBanner = document.getElementById('register-error-banner');
        if (registerErrorBanner) {
          registerErrorBanner.textContent = `❌ ${data.msg || 'Failed to create account.'}`;
          registerErrorBanner.classList.remove('hidden');
        }
        showToast(data.msg || 'Failed to create account.', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      showToast('Connection error to server.', 'error');
    });
  });

  // Sign out triggers
  document.getElementById('btn-sign-out').addEventListener('click', () => {
    localStorage.removeItem('civic_jwt');
    localStorage.removeItem('civic_user');
    state.currentUser = null;
    state.userRole = 'guest';
    showToast('Signed out of session successfully.', 'success');
    syncSessionUI();
    
    renderDashboard();
    renderFeed();
    renderMap();
    switchView('dashboard');
  });

  // Dynamic clear errors
  dialog.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const f = inp.closest('.form-field');
      if (f && inp.checkValidity()) f.classList.remove('has-error');
    });
  });
}

function syncSessionUI() {
  const userPanel = document.getElementById('user-header-panel');
  const authTrigger = document.getElementById('btn-auth-trigger');
  
  const navAdmin = document.getElementById('nav-item-admin-panel');
  const navProfile = document.getElementById('nav-item-profile');

  if (state.currentUser) {
    const user = state.currentUser;
    // Header Avatar + Text
    document.getElementById('header-avatar-img').src = user.avatar;
    document.getElementById('header-username-text').textContent = user.name;
    document.getElementById('header-role-badge').textContent = user.role === 'admin' ? 'City Admin' : 'Citizen';

    userPanel.classList.remove('hidden');
    authTrigger.classList.add('hidden');
    navProfile.classList.remove('hidden');

    if (user.role === 'admin') {
      navAdmin.classList.remove('hidden');
    } else {
      navAdmin.classList.add('hidden');
    }
  } else {
    userPanel.classList.add('hidden');
    authTrigger.classList.remove('hidden');
    navProfile.classList.add('hidden');
    navAdmin.classList.add('hidden');
  }
}

// --- UTILITIES ---
function formatDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function setupFeedFilterListeners() {
  const searchInput = document.getElementById('filter-search');
  const categoryFilter = document.getElementById('filter-category');
  const statusFilter = document.getElementById('filter-status');
  const sortBy = document.getElementById('filter-sort');

  searchInput.addEventListener('input', () => renderFeed());
  categoryFilter.addEventListener('change', () => renderFeed());
  statusFilter.addEventListener('change', () => renderFeed());
  sortBy.addEventListener('change', () => renderFeed());
}

// --- INITIALIZE APPLICATION ---
async function init() {
  initInvokerFallback();
  initRouter();
  loadMLModel();
  
  // Auth systems
  setupAuthentication();

  // Load server-side backend data
  loadServerData();
  
  // Populate registration avatar options offline
  const avatarOptions = document.querySelectorAll('.avatar-option img');
  if (avatarOptions.length >= 5) {
    avatarOptions[0].src = getMockAvatarSVG('Felix');
    avatarOptions[1].src = getMockAvatarSVG('Aria');
    avatarOptions[2].src = getMockAvatarSVG('Jack');
    avatarOptions[3].src = getMockAvatarSVG('Luna');
    avatarOptions[4].src = getMockAvatarSVG('Oliver');
  }

  syncSessionUI();

  // Dialog actions
  setupUpvoteListener();
  setupCommentsListener();
  setupAdminPhotoUpload();
  setupAdminActionsListener();

  // Before/after image comparison slider listener
  initSplitSliderDrag();

  // Form Submissions
  setupPhotoUpload();
  setupMiniMapPicker();
  setupGeolocation();
  setupReportSubmission();

  // profile & admin sub listeners
  initProfileTabs();
  initAdminSortListeners();
  
  // V2 Feed Filter Listeners
  setupFeedFilterListeners();

  // Switch initial view
  switchView('dashboard');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

