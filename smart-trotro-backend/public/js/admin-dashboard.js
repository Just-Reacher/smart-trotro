// admin-dashboard.js
'use strict';

const API_BASE = '/api';

/* ─────────────────────────────────────────
   AUTH GUARD
───────────────────────────────────────── */
const _token = localStorage.getItem('st_token');
const _user  = JSON.parse(localStorage.getItem('st_user') || 'null');

if (!_token || !_user || _user.role !== 'admin') {
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
   SECTION META
───────────────────────────────────────── */
const SECTION_META = {
  dashboard:  'Dashboard',
  drivers:    'Manage Drivers',
  passengers: 'Manage Passengers',
  routes:     'Manage Routes',
  parcels:    'Parcel Management',
  payments:   'Payments',
  logs:       'System Logs',
};

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('section-' + name);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-btn[data-section="${name}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('breadcrumb-current').textContent = SECTION_META[name] || name;
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
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.style.borderLeftColor =
    type === 'error'   ? 'var(--red)'   :
    type === 'success' ? 'var(--green)' : 'var(--teal)';
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
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
═════════════════════════════════════════
   Hits: GET /api/admin/stats
   Fills: total-drivers, total-passengers, active-routes,
          total-parcels, completed-deliveries, total-transactions
   Also loads preview rows for the two mini-tables.
═══════════════════════════════════════ */
function loadDashboardStats() {
  apiFetch('/admin/stats')
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const d = data.data;

      const statMap = {
        'total-drivers':        d.totalDrivers,
        'total-passengers':     d.totalPassengers,
        'active-routes':        d.activeRoutes,
        'total-parcels':        d.totalParcels,
        'completed-deliveries': d.completedDeliveries,
        'total-transactions':   d.totalTransactions,
      };

      Object.entries(statMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = val ?? '—';
          el.classList.remove('skeleton');
        }
      });
    })
    .catch(() => {
      ['total-drivers','total-passengers','active-routes',
       'total-parcels','completed-deliveries','total-transactions']
        .forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.textContent = '—'; el.classList.remove('skeleton'); }
        });
    });

  // Load preview tables on the dashboard
  loadDashDriversPreview();
  loadDashTransactionsPreview();
}

function loadDashDriversPreview() {
  apiFetch('/admin/drivers?limit=4')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('dash-drivers-body');
      const empty = document.getElementById('dash-drivers-empty');
      if (!tbody) return;
      const rows = data.data || [];
      if (!rows.length) return;

      empty.style.display = 'none';
      tbody.innerHTML = rows.map(d => `
        <tr>
          <td class="mono">${d.id.slice(0,8)}…</td>
          <td>${d.first_name} ${d.last_name}</td>
          <td>${d.primary_route || '—'}</td>
          <td><span class="badge ${d.status}">${d.status}</span></td>
        </tr>`).join('');
    })
    .catch(() => {});
}

function loadDashTransactionsPreview() {
  apiFetch('/admin/payments?limit=4')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('dash-txn-body');
      const empty = document.getElementById('dash-txn-empty');
      if (!tbody) return;
      const rows = data.data || [];
      if (!rows.length) return;

      empty.style.display = 'none';
      tbody.innerHTML = rows.map(t => `
        <tr>
          <td class="mono">${t.id.slice(0,8)}…</td>
          <td>${t.user_name}</td>
          <td>GH₵ ${Number(t.amount).toFixed(2)}</td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
        </tr>`).join('');
    })
    .catch(() => {});
}

/* ═════════════════════════════════════════
   SECTION 2 — MANAGE DRIVERS
═════════════════════════════════════════
   Hits: GET /api/admin/drivers
   Fills: drivers-table-body
   Columns: Driver ID | Name | Phone | Vehicle No. | Route | Status | Actions
═══════════════════════════════════════ */
function loadDrivers() {
  showToast('Fetching drivers…');

  apiFetch('/admin/drivers')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('drivers-table-body');
      if (!tbody) return;
      const drivers = data.data || [];

      tbody.innerHTML = drivers.map(d => `
        <tr>
          <td class="mono">${d.id.slice(0,8)}…</td>
          <td>${d.first_name} ${d.last_name}</td>
          <td>${d.phone}</td>
          <td class="mono">${d.vehicle_number || '—'}</td>
          <td>${d.primary_route || '—'}</td>
          <td><span class="badge ${d.status}">${d.status}</span></td>
          <td>
            <div class="actions">
              <button class="act-btn approve"
                data-driver-approve="${d.id}">Approve</button>
              <button class="act-btn suspend"
                data-driver-suspend="${d.id}">Suspend</button>
              <button class="act-btn remove"
                data-driver-remove="${d.id}">Remove</button>
            </div>
          </td>
        </tr>`).join('');

      syncEmpty('drivers-table-body', 'drivers-empty', 'drivers-count');
      showToast(`${drivers.length} driver(s) loaded.`, 'success');
    })
    .catch(() => showToast('Failed to load drivers.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 3 — MANAGE PASSENGERS
═════════════════════════════════════════
   Hits: GET /api/admin/passengers
   Fills: passengers-table-body
   Columns: Passenger ID | Name | Phone | Email | Status | Actions
═══════════════════════════════════════ */
function loadPassengers() {
  showToast('Fetching passengers…');

  apiFetch('/admin/passengers')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('passengers-table-body');
      if (!tbody) return;
      const passengers = data.data || [];

      tbody.innerHTML = passengers.map(p => `
        <tr>
          <td class="mono">${p.id.slice(0,8)}…</td>
          <td>${p.first_name} ${p.last_name}</td>
          <td>${p.phone}</td>
          <td>${p.email}</td>
          <td><span class="badge ${p.status}">${p.status}</span></td>
          <td>
            <div class="actions">
              <button class="act-btn view"
                data-passenger-view="${p.id}">View</button>
              <button class="act-btn suspend"
                data-passenger-suspend="${p.id}">Suspend</button>
              <button class="act-btn remove"
                data-passenger-remove="${p.id}">Remove</button>
            </div>
          </td>
        </tr>`).join('');

      syncEmpty('passengers-table-body', 'passengers-empty', 'passengers-count');
      showToast(`${passengers.length} passenger(s) loaded.`, 'success');
    })
    .catch(() => showToast('Failed to load passengers.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 4 — MANAGE ROUTES
═════════════════════════════════════════
   Hits: GET /api/routes  (all statuses)
         POST /api/routes (add route)
   Fills: routes-table-body
   Columns: Route ID | Route Name | Start | End | Status | Actions
═══════════════════════════════════════ */
function loadRoutes() {
  showToast('Fetching routes…');

  apiFetch('/routes?status=all')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('routes-table-body');
      if (!tbody) return;
      const routes = data.data || [];

      tbody.innerHTML = routes.map(r => `
        <tr>
          <td class="mono">${r.id.slice(0,8)}…</td>
          <td>${r.route_name}</td>
          <td>${r.start_location}</td>
          <td>${r.end_location}</td>
          <td><span class="badge ${r.status}">${r.status}</span></td>
          <td>
            <div class="actions">
              <button class="act-btn edit"
                data-route-edit="${r.id}">Edit</button>
              <button class="act-btn remove"
                data-route-delete="${r.id}">Delete</button>
            </div>
          </td>
        </tr>`).join('');

      syncEmpty('routes-table-body', 'routes-empty', 'routes-count');
      showToast(`${routes.length} route(s) loaded.`, 'success');
    })
    .catch(() => showToast('Failed to load routes.', 'error'));
}

function addRoute() {
  const name  = document.getElementById('route-name').value.trim();
  const start = document.getElementById('route-start').value.trim();
  const end   = document.getElementById('route-end').value.trim();

  if (!name || !start || !end) {
    showToast('Please fill in all route fields.', 'error');
    return;
  }

  apiFetch('/routes', {
    method: 'POST',
    body:   JSON.stringify({ routeName: name, startLocation: start, endLocation: end }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || 'Failed to add route.', 'error');
        return;
      }
      showToast(`Route "${name}" added successfully.`, 'success');
      document.getElementById('route-name').value  = '';
      document.getElementById('route-start').value = '';
      document.getElementById('route-end').value   = '';
      loadRoutes();
    })
    .catch(() => showToast('Failed to add route.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 5 — PARCEL MANAGEMENT
═════════════════════════════════════════
   Hits: GET /api/parcels/all
   Fills: parcels-table-body
   Columns: Parcel ID | Pickup | Drop | Driver | Status | Date
═══════════════════════════════════════ */
function loadParcels() {
  showToast('Fetching parcels…');

  apiFetch('/parcels/all')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('parcels-table-body');
      if (!tbody) return;
      const parcels = data.data || [];

      tbody.innerHTML = parcels.map(p => `
        <tr>
          <td class="mono">${p.id.slice(0,8)}…</td>
          <td>${p.pickup_location}</td>
          <td>${p.drop_location}</td>
          <td>${p.driver_name || '—'}</td>
          <td><span class="badge ${(p.status || '').replace('_','-')}">${p.status}</span></td>
          <td>${p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('');

      syncEmpty('parcels-table-body', 'parcels-empty', 'parcels-count');
      showToast(`${parcels.length} parcel(s) loaded.`, 'success');
    })
    .catch(() => showToast('Failed to load parcels.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 6 — PAYMENTS
═════════════════════════════════════════
   Hits: GET /api/admin/payments
   Fills: payments-table-body
   Columns: Txn ID | User | Amount | Method | Status | Date
═══════════════════════════════════════ */
function loadPayments() {
  showToast('Fetching transactions…');

  apiFetch('/admin/payments')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('payments-table-body');
      if (!tbody) return;
      const txns = data.data || [];

      tbody.innerHTML = txns.map(t => `
        <tr>
          <td class="mono">${t.id.slice(0,8)}…</td>
          <td>${t.user_name}</td>
          <td>GH₵ ${Number(t.amount).toFixed(2)}</td>
          <td>${(t.payment_method || '').replace(/_/g, ' ')}</td>
          <td><span class="badge ${t.status}">${t.status}</span></td>
          <td>${t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('');

      syncEmpty('payments-table-body', 'payments-empty', 'payments-count');
      showToast(`${txns.length} transaction(s) loaded.`, 'success');
    })
    .catch(() => showToast('Failed to load transactions.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 7 — SYSTEM LOGS
═════════════════════════════════════════
   Hits: GET /api/logs
   Fills: logs-table-body
   Columns: Log ID | User | Level | Action | Date
═══════════════════════════════════════ */
function loadLogs() {
  showToast('Fetching system logs…');

  apiFetch('/logs')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById('logs-table-body');
      if (!tbody) return;
      const logs = data.data || [];

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td class="mono">${l.id.slice(0,8)}…</td>
          <td>${l.user_name || 'System'}</td>
          <td><span class="log-tag ${l.level}">${l.level}</span></td>
          <td>${l.action}</td>
          <td>${l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('');

      syncEmpty('logs-table-body', 'logs-empty', 'logs-count');
      showToast(`${logs.length} log(s) loaded.`, 'success');
    })
    .catch(() => showToast('Failed to load logs.', 'error'));
}

/* ═════════════════════════════════════════
   DRIVER ACTIONS
═════════════════════════════════════════ */
function approveDriver(driverId) {
  apiFetch(`/admin/drivers/${driverId}/approve`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Driver approved.', 'success');
      loadDrivers();
    })
    .catch(() => showToast('Failed to approve driver.', 'error'));
}

function suspendDriver(driverId) {
  apiFetch(`/admin/drivers/${driverId}/suspend`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Driver suspended.', 'success');
      loadDrivers();
    })
    .catch(() => showToast('Failed to suspend driver.', 'error'));
}

function removeDriver(driverId) {
  if (!confirm('Permanently remove this driver?')) return;
  apiFetch(`/admin/drivers/${driverId}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Driver removed.', 'success');
      loadDrivers();
    })
    .catch(() => showToast('Failed to remove driver.', 'error'));
}

/* ═════════════════════════════════════════
   PASSENGER ACTIONS
═════════════════════════════════════════ */
function suspendPassenger(passengerId) {
  apiFetch(`/admin/passengers/${passengerId}/suspend`, { method: 'PATCH' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Passenger suspended.', 'success');
      loadPassengers();
    })
    .catch(() => showToast('Failed to suspend passenger.', 'error'));
}

function removePassenger(passengerId) {
  if (!confirm('Permanently remove this passenger?')) return;
  apiFetch(`/admin/passengers/${passengerId}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      showToast(data.message || 'Passenger removed.', 'success');
      loadPassengers();
    })
    .catch(() => showToast('Failed to remove passenger.', 'error'));
}

/* ═════════════════════════════════════════
   DELEGATED ACTION LISTENERS
   One listener per table tbody — handles all
   dynamically rendered action buttons.
═════════════════════════════════════════ */
function bindTableActions() {
  // Drivers table
  const driversTbody = document.getElementById('drivers-table-body');
  if (driversTbody) {
    driversTbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-driver-approve],[data-driver-suspend],[data-driver-remove]');
      if (!btn) return;
      if (btn.dataset.driverApprove)       approveDriver(btn.dataset.driverApprove);
      else if (btn.dataset.driverSuspend)  suspendDriver(btn.dataset.driverSuspend);
      else if (btn.dataset.driverRemove)   removeDriver(btn.dataset.driverRemove);
    });
  }

  // Passengers table
  const passengersTbody = document.getElementById('passengers-table-body');
  if (passengersTbody) {
    passengersTbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-passenger-suspend],[data-passenger-remove]');
      if (!btn) return;
      if (btn.dataset.passengerSuspend)    suspendPassenger(btn.dataset.passengerSuspend);
      else if (btn.dataset.passengerRemove) removePassenger(btn.dataset.passengerRemove);
    });
  }

  // Routes table
  const routesTbody = document.getElementById('routes-table-body');
  if (routesTbody) {
    routesTbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-route-delete]');
      if (!btn) return;
      const routeId = btn.dataset.routeDelete;
      if (!confirm('Delete this route?')) return;
      apiFetch(`/routes/${routeId}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
          showToast(data.message || 'Route deleted.', 'success');
          loadRoutes();
        })
        .catch(() => showToast('Failed to delete route.', 'error'));
    });
  }
}

/* ═════════════════════════════════════════
   INIT
═════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // Inject admin name into sidebar
  if (_user) {
    const initials = ((_user.first_name || 'A')[0] + (_user.last_name || '')[0]).toUpperCase();
    const fullName = `${_user.first_name || ''} ${_user.last_name || ''}`.trim() || 'Admin';
    const sbAvatar = document.getElementById('sb-avatar');
    const sbName   = document.getElementById('sb-name');
    const hdrAvatar = document.getElementById('hdr-avatar');
    if (sbAvatar)  sbAvatar.textContent  = initials;
    if (sbName)    sbName.textContent    = fullName;
    if (hdrAvatar) hdrAvatar.textContent = initials;
  }

  // Sidebar nav
  document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  // Dashboard preview "View All" buttons
  const dashViewDrivers  = document.getElementById('dash-view-drivers');
  const dashViewPayments = document.getElementById('dash-view-payments');
  if (dashViewDrivers)  dashViewDrivers.addEventListener('click',  () => showSection('drivers'));
  if (dashViewPayments) dashViewPayments.addEventListener('click', () => showSection('payments'));

  // Sidebar + overlay
  document.getElementById('hamburger-btn').addEventListener('click', toggleSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Search inputs
  const searchBindings = {
    'search-drivers':    'drivers-table-body',
    'search-passengers': 'passengers-table-body',
    'search-routes':     'routes-table-body',
    'search-parcels':    'parcels-table-body',
    'search-payments':   'payments-table-body',
    'search-logs':       'logs-table-body',
  };
  Object.entries(searchBindings).forEach(([inputId, tbodyId]) => {
    const input = document.getElementById(inputId);
    if (input) input.addEventListener('input', () => filterTable(tbodyId, input.value));
  });

  // Refresh buttons
  const refreshBindings = {
    'refresh-drivers':    loadDrivers,
    'refresh-passengers': loadPassengers,
    'refresh-routes':     loadRoutes,
    'refresh-parcels':    loadParcels,
    'refresh-payments':   loadPayments,
    'refresh-logs':       loadLogs,
  };
  Object.entries(refreshBindings).forEach(([btnId, fn]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', fn);
  });

  // Add route button
  const addRouteBtn = document.getElementById('add-route-btn');
  if (addRouteBtn) addRouteBtn.addEventListener('click', addRoute);

  // Delegate table action buttons (approve/suspend/remove etc.)
  bindTableActions();

  // Load dashboard data immediately
  loadDashboardStats();
});