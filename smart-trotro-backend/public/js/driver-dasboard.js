// driver-dashboard.js
'use strict';

const API_BASE = '/api';

/* ─────────────────────────────────────────
   AUTH GUARD
───────────────────────────────────────── */
const _token = localStorage.getItem('st_token');
const _user  = JSON.parse(localStorage.getItem('st_user') || 'null');

if (!_token || !_user || _user.role !== 'driver') {
  window.location.replace('login.html');
}

/* ─────────────────────────────────────────
   AUTHORISED FETCH
───────────────────────────────────────── */
function apiFetch(path, options = {}) {
  return fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + _token,
      ...(options.headers || {}),
    },
  });
}

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let _routeActive = false;
let _activeTrip  = null; // trip object returned by startRoute

/* ─────────────────────────────────────────
   SECTION META
───────────────────────────────────────── */
const _meta = {
  dashboard: 'Dashboard',
  route:     'Start Route',
  requests:  'Parcel Requests',
  myparcels: 'My Parcels',
  earnings:  'Earnings',
  history:   'Trip History',
};

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */
function showSection(name, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('section-' + name);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');

  document.getElementById('bc-current').textContent = _meta[name] || name;
  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('on');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('on');
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
let _toastTimer;
function showToast(msg, type) {
  const el  = document.getElementById('toast');
  const col = type === 'error'   ? 'var(--red)'
            : type === 'success' ? 'var(--green)'
            : 'var(--amber)';
  el.style.borderLeftColor            = col;
  el.querySelector('svg').style.color = col;
  document.getElementById('toast-msg').textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}

/* ─────────────────────────────────────────
   TABLE FILTER
───────────────────────────────────────── */
function filterTable(tbodyId, query) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const q = query.toLowerCase();
  tbody.querySelectorAll('tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

/* ─────────────────────────────────────────
   EMPTY STATE SYNC
───────────────────────────────────────── */
function syncEmpty(tbodyId, emptyId, countId) {
  const tbody = document.getElementById(tbodyId);
  const empty = document.getElementById(emptyId);
  const count = document.getElementById(countId);
  if (!tbody || !empty) return;
  const n = tbody.querySelectorAll('tr').length;
  empty.style.display = n > 0 ? 'none' : 'block';
  if (count) count.textContent = n + ' record' + (n !== 1 ? 's' : '');
}

/* ─────────────────────────────────────────
   ROUTE UI STATE
───────────────────────────────────────── */
function setRouteUI(active, routeName) {
  _routeActive = active;

  document.getElementById('btn-start-route').disabled = active;
  document.getElementById('btn-stop-route').disabled  = !active;

  const statusEl = document.getElementById('route-status');
  statusEl.textContent = active
    ? '🟢 Route is live — you are now visible to passengers'
    : '🔴 Route stopped';
  statusEl.className = active ? 'on' : 'off';

  const chip  = document.getElementById('header-route-chip');
  const dot   = document.getElementById('header-route-dot');
  const label = document.getElementById('header-route-label');
  chip.className    = active ? 'route-status-chip active-route' : 'route-status-chip';
  dot.className     = active ? 'route-dot live' : 'route-dot';
  label.textContent = active ? (routeName || 'Route Active') : 'No Active Route';

  const pill = document.getElementById('sidebar-route-pill');
  pill.textContent = active ? 'On' : 'Off';
  pill.className   = active ? 'route-pill on' : 'route-pill off';

  document.getElementById('sb-status').textContent             = active ? 'Online' : 'Offline';
  document.getElementById('info-session-status').textContent   = active ? 'Active' : 'Offline';
}

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
function handleLogout() {
  apiFetch('/auth/logout', { method: 'POST' }).finally(() => {
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_user');
    window.location.replace('login.html');
  });
}

/* ═════════════════════════════════════════
   SECTION 1 — DASHBOARD STATS
   GET /api/drivers/stats
   Fills: today-trips, active-route,
          parcel-deliveries, total-earnings
   Also loads preview tables for recent
   parcel requests and recent trips.
   Seeded: Kojo — 1 completed trip, 1 delivered
           parcel, GH₵8 earnings.
═════════════════════════════════════════ */
function loadDriverStats() {
  apiFetch('/drivers/stats')
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const d = data.data;

      const statMap = {
        'today-trips':        d.todayTrips,
        'active-route':       d.activeRoute   || '—',
        'parcel-deliveries':  d.parcelDeliveries,
        'total-earnings':     d.totalEarnings ? `GH₵ ${d.totalEarnings}` : '—',
      };

      Object.entries(statMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; el.classList.remove('skeleton', 'loading'); }
      });

      // If the driver has an active trip, restore the route UI
      if (d.activeTrip && d.activeRoute) {
        _activeTrip = { id: d.activeTrip };
        setRouteUI(true, d.activeRoute);
        document.getElementById('info-route-name').textContent = d.activeRoute;
      }
    })
    .catch(() => {
      ['today-trips','active-route','parcel-deliveries','total-earnings'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = '—'; el.classList.remove('skeleton', 'loading'); }
      });
    });

  // Load dashboard preview tables
  loadParcelRequestsPreview();
  loadTripHistoryPreview();
}

function loadParcelRequestsPreview() {
  apiFetch('/parcels/requests')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('dash-requests-body');
      const empty = document.getElementById('dash-requests-empty');
      if (!tbody) return;
      const rows = (data.data || []).slice(0, 3);
      if (!rows.length) return;

      empty.style.display = 'none';
      tbody.innerHTML = rows.map(p => `
        <tr>
          <td class="mono">${p.id.slice(0, 8)}…</td>
          <td>${p.pickup_location}</td>
          <td>${p.drop_location}</td>
          <td>GH₵ ${Number(p.delivery_fee).toFixed(2)}</td>
          <td><span class="badge ${p.status}">${p.status}</span></td>
        </tr>`).join('');
    })
    .catch(() => {});
}

function loadTripHistoryPreview() {
  apiFetch('/trips/history?limit=3')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('dash-trips-body');
      const empty = document.getElementById('dash-trips-empty');
      if (!tbody) return;
      const rows = data.data || [];
      if (!rows.length) return;

      empty.style.display = 'none';
      tbody.innerHTML = rows.map(t => `
        <tr>
          <td class="mono">${t.id.slice(0, 8)}…</td>
          <td>${t.route_name}</td>
          <td>GH₵ ${Number(t.total_earnings || 0).toFixed(2)}</td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
        </tr>`).join('');
    })
    .catch(() => {});
}

/* ═════════════════════════════════════════
   SECTION 2 — START ROUTE
   POST /api/trips/start   { routeId }
   POST /api/trips/stop
   GET  /api/routes         (populate dropdown)
   Seeded routes: Circle–Madina, Kaneshie–Tema,
                  Accra–Legon, Achimota–Adenta.
═════════════════════════════════════════ */
function loadRoutesDropdown() {
  apiFetch('/routes')
    .then(r => r.json())
    .then(data => {
      const select = document.getElementById('driver-route-select');
      if (!select) return;
      const routes = data.data || [];
      select.innerHTML =
        '<option value="">— Choose your route —</option>' +
        routes.map(r =>
          `<option value="${r.id}">${r.route_name} (${r.start_location} → ${r.end_location})</option>`
        ).join('');
    })
    .catch(() => {});
}

function startRoute() {
  const select  = document.getElementById('driver-route-select');
  const routeId = select.value;
  if (!routeId) { showToast('Please select a route first.', 'error'); return; }

  const routeName = select.selectedOptions[0]?.text || routeId;

  apiFetch('/trips/start', {
    method: 'POST',
    body:   JSON.stringify({ routeId }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || 'Failed to start route.', 'error');
        return;
      }
      _activeTrip = data.data.trip;
      setRouteUI(true, routeName);
      document.getElementById('info-route-name').textContent = data.data.routeName || routeName;
      document.getElementById('info-start-time').textContent = new Date().toLocaleTimeString();
      showToast('Route started successfully!', 'success');

      // Begin pushing GPS location every 30 seconds
      startLocationUpdates();
      loadDriverStats();
    })
    .catch(() => showToast('Could not start route. Try again.', 'error'));
}

function stopRoute() {
  apiFetch('/trips/stop', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || 'Failed to stop route.', 'error');
        return;
      }
      _activeTrip = null;
      setRouteUI(false);
      document.getElementById('info-route-name').textContent    = '—';
      document.getElementById('info-start-time').textContent    = '—';
      document.getElementById('info-passengers').textContent    = '—';
      document.getElementById('driver-location').textContent    = 'Waiting for location data…';
      stopLocationUpdates();
      showToast('Route stopped.', 'success');
      loadTripHistory();
      loadDriverStats();
    })
    .catch(() => showToast('Could not stop route. Try again.', 'error'));
}

/* ─── GPS location pusher ───────────────────────────────────────────────── */
let _locationInterval = null;

function startLocationUpdates() {
  if (!navigator.geolocation || _locationInterval) return;

  _locationInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      apiFetch('/tracking/location', {
        method: 'PATCH',
        body:   JSON.stringify({
          latitude:  coords.latitude,
          longitude: coords.longitude,
          tripId:    _activeTrip?.id || null,
        }),
      }).catch(() => {}); // silent — location updates are best-effort

      document.getElementById('driver-location').textContent =
        `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
    }, () => {});
  }, 30000);

  // Fire immediately on start
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    document.getElementById('driver-location').textContent =
      `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  }, () => {
    document.getElementById('driver-location').textContent = 'Location unavailable';
  });
}

function stopLocationUpdates() {
  if (_locationInterval) {
    clearInterval(_locationInterval);
    _locationInterval = null;
  }
}

/* ═════════════════════════════════════════
   SECTION 3 — PARCEL REQUESTS
   GET /api/parcels/requests
   Fills: parcel-requests-body
   Seeded: 5 parcels — some pending (available
   for the driver to accept), some already
   accepted/delivered.
═════════════════════════════════════════ */
function loadParcelRequests() {
  showToast('Fetching parcel requests…');

  apiFetch('/parcels/requests')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('parcel-requests-body');
      if (!tbody) return;
      const parcels = data.data || [];

      tbody.innerHTML = parcels.map(p => `
        <tr>
          <td class="mono">${p.id.slice(0, 8)}…</td>
          <td>${p.pickup_location}</td>
          <td>${p.drop_location}</td>
          <td>GH₵ ${Number(p.delivery_fee).toFixed(2)}</td>
          <td><span class="badge ${p.status}">${p.status}</span></td>
          <td>
            <div class="actions">
              <button class="act-btn accept"
                data-parcel-accept="${p.id}">Accept</button>
              <button class="act-btn decline"
                data-parcel-decline="${p.id}">Decline</button>
            </div>
          </td>
        </tr>`).join('');

      syncEmpty('parcel-requests-body', 'requests-empty', 'requests-count');
      showToast(`${parcels.length} request(s) available.`, 'success');
    })
    .catch(() => showToast('Failed to load parcel requests.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 4 — MY PARCELS
   GET /api/parcels/mine
   Fills: my-parcels-body
   Seeded: Kojo has 1 delivered parcel,
           Fiifi has 1 picked_up parcel.
═════════════════════════════════════════ */
function loadMyParcels() {
  showToast('Fetching assigned parcels…');

  apiFetch('/parcels/mine')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('my-parcels-body');
      if (!tbody) return;
      const parcels = data.data || [];

      tbody.innerHTML = parcels.map(p => `
        <tr>
          <td class="mono">${p.id.slice(0, 8)}…</td>
          <td>${p.pickup_location}</td>
          <td>${p.drop_location}</td>
          <td>${p.receiver_contact}</td>
          <td><span class="badge ${(p.status || '').replace('_', '-')}">${(p.status || '').replace(/_/g, ' ')}</span></td>
          <td>
            <div class="actions">
              <button class="act-btn pickup"
                data-parcel-pickup="${p.id}">Mark Picked Up</button>
              <button class="act-btn deliver"
                data-parcel-deliver="${p.id}">Mark Delivered</button>
            </div>
          </td>
        </tr>`).join('');

      syncEmpty('my-parcels-body', 'myparcels-empty', 'myparcels-count');
      showToast(`${parcels.length} parcel(s) assigned.`, 'success');
    })
    .catch(() => showToast('Failed to load assigned parcels.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 5 — EARNINGS
   GET /api/earnings
   Fills: earnings-today, earnings-week,
          earnings-month + earnings-table-body
   Seeded: Kojo — GH₵8 from parcel delivery,
           Fiifi — GH₵15 from parcel delivery.
═════════════════════════════════════════ */
function loadEarnings() {
  showToast('Fetching earnings…');

  apiFetch('/earnings')
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const { summary, breakdown } = data.data;

      // Summary cards
      const periodMap = {
        'earnings-today': summary.today,
        'earnings-week':  summary.week,
        'earnings-month': summary.month,
      };
      Object.entries(periodMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<span class="earn-currency">GH₵</span>${val}`;
        el.classList.remove('skeleton');
      });

      // Breakdown table
      const tbody = document.getElementById('earnings-table-body');
      if (!tbody) return;

      tbody.innerHTML = (breakdown || []).map(e => `
        <tr>
          <td class="mono">${e.trip_id.slice(0, 8)}…</td>
          <td>${e.route_name}</td>
          <td>${e.passengers}</td>
          <td>GH₵ ${Number(e.parcel_earnings || 0).toFixed(2)}</td>
          <td>GH₵ ${Number(e.total_amount   || 0).toFixed(2)}</td>
          <td>${e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
        </tr>`).join('');

      syncEmpty('earnings-table-body', 'earnings-empty', 'earnings-count');
      showToast('Earnings loaded.', 'success');
    })
    .catch(() => showToast('Failed to load earnings.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 6 — TRIP HISTORY
   GET /api/trips/history
   Fills: trip-history-body
   Seeded: 1 completed trip per driver with
   start/end times, passenger count, earnings.
═════════════════════════════════════════ */
function loadTripHistory() {
  showToast('Fetching trip history…');

  apiFetch('/trips/history')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('trip-history-body');
      if (!tbody) return;
      const trips = data.data || [];

      tbody.innerHTML = trips.map(t => `
        <tr>
          <td class="mono">${t.id.slice(0, 8)}…</td>
          <td>${t.route_name}</td>
          <td>${t.start_time ? new Date(t.start_time).toLocaleString() : '—'}</td>
          <td>${t.end_time   ? new Date(t.end_time).toLocaleString()   : '—'}</td>
          <td>${t.parcels_delivered ?? 0}</td>
          <td>GH₵ ${Number(t.total_earnings || 0).toFixed(2)}</td>
        </tr>`).join('');

      syncEmpty('trip-history-body', 'history-empty', 'history-count');
      showToast(`${trips.length} trip(s) found.`, 'success');
    })
    .catch(() => showToast('Failed to load trip history.', 'error'));
}

/* ═════════════════════════════════════════
   PARCEL ACTIONS
   PATCH /api/parcels/:id/accept
   PATCH /api/parcels/:id/decline
   PATCH /api/parcels/:id/pickup
   PATCH /api/parcels/:id/deliver
═════════════════════════════════════════ */
function acceptParcel(parcelId) {
  apiFetch(`/parcels/${parcelId}/accept`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Parcel accepted.', 'success');
      loadParcelRequests();
      loadMyParcels();
    })
    .catch(() => showToast('Failed to accept parcel.', 'error'));
}

function declineParcel(parcelId) {
  apiFetch(`/parcels/${parcelId}/decline`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Parcel declined.', 'success');
      loadParcelRequests();
    })
    .catch(() => showToast('Failed to decline parcel.', 'error'));
}

function markParcelPickedUp(parcelId) {
  apiFetch(`/parcels/${parcelId}/pickup`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Parcel marked as picked up.', 'success');
      loadMyParcels();
    })
    .catch(() => showToast('Failed to update parcel status.', 'error'));
}

function markParcelDelivered(parcelId) {
  apiFetch(`/parcels/${parcelId}/deliver`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Parcel delivered!', 'success');
      loadMyParcels();
      loadEarnings();
      loadDriverStats();
    })
    .catch(() => showToast('Failed to update parcel status.', 'error'));
}

/* ═════════════════════════════════════════
   INIT
═════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // Inject driver name + initials from localStorage
  if (_user) {
    const initials = ((_user.first_name || 'D')[0] + (_user.last_name || '')[0]).toUpperCase();
    const fullName = `${_user.first_name || ''} ${_user.last_name || ''}`.trim() || 'Driver';
    const elMap = {
      'sb-avatar':  initials,
      'sb-name':    fullName,
      'hdr-avatar': initials,
    };
    Object.entries(elMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }

  // Sidebar nav — id-based map
  const navMap = {
    'nav-dashboard': 'dashboard',
    'nav-route':     'route',
    'nav-requests':  'requests',
    'nav-myparcels': 'myparcels',
    'nav-earnings':  'earnings',
    'nav-history':   'history',
  };
  Object.entries(navMap).forEach(([btnId, section]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', () => showSection(section, btn));
  });

  // Dashboard preview "View All" buttons
  const dvrBtn = document.getElementById('dash-view-requests');
  const dhBtn  = document.getElementById('dash-view-history');
  if (dvrBtn) dvrBtn.addEventListener('click', () =>
    showSection('requests', document.getElementById('nav-requests')));
  if (dhBtn)  dhBtn.addEventListener('click',  () =>
    showSection('history',  document.getElementById('nav-history')));

  // Hamburger + overlay + escape
  document.getElementById('hamburger-btn').addEventListener('click', toggleSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Start / Stop route buttons
  document.getElementById('btn-start-route').addEventListener('click', startRoute);
  document.getElementById('btn-stop-route').addEventListener('click', stopRoute);

  // Refresh buttons
  const refreshMap = {
    'refresh-requests':  loadParcelRequests,
    'refresh-myparcels': loadMyParcels,
    'refresh-earnings':  loadEarnings,
    'refresh-history':   loadTripHistory,
  };
  Object.entries(refreshMap).forEach(([btnId, fn]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', fn);
  });

  // Search inputs
  const searchMap = {
    'search-requests':  'parcel-requests-body',
    'search-myparcels': 'my-parcels-body',
    'search-earnings':  'earnings-table-body',
    'search-history':   'trip-history-body',
  };
  Object.entries(searchMap).forEach(([inputId, tbodyId]) => {
    const input = document.getElementById(inputId);
    if (input) input.addEventListener('input', () => filterTable(tbodyId, input.value));
  });

  // Delegated click — parcel request actions (accept / decline)
  const requestsTbody = document.getElementById('parcel-requests-body');
  if (requestsTbody) {
    requestsTbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-parcel-accept],[data-parcel-decline]');
      if (!btn) return;
      if (btn.dataset.parcelAccept)        acceptParcel(btn.dataset.parcelAccept);
      else if (btn.dataset.parcelDecline)  declineParcel(btn.dataset.parcelDecline);
    });
  }

  // Delegated click — my parcels actions (pickup / deliver)
  const myParcelsTbody = document.getElementById('my-parcels-body');
  if (myParcelsTbody) {
    myParcelsTbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-parcel-pickup],[data-parcel-deliver]');
      if (!btn) return;
      if (btn.dataset.parcelPickup)        markParcelPickedUp(btn.dataset.parcelPickup);
      else if (btn.dataset.parcelDeliver)  markParcelDelivered(btn.dataset.parcelDeliver);
    });
  }

  // ── Initial data load ──────────────────────────────────────────────────────
  loadRoutesDropdown(); // populate Start Route dropdown
  loadDriverStats();    // stat cards + preview tables + restore active trip state
});