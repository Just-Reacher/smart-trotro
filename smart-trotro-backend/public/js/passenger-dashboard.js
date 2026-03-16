// passenger-dashboard.js
'use strict';

const API_BASE = '/api';

/* ─────────────────────────────────────────
   AUTH GUARD
───────────────────────────────────────── */
const _token = localStorage.getItem('st_token');
const _user  = JSON.parse(localStorage.getItem('st_user') || 'null');

if (!_token || !_user || _user.role !== 'passenger') {
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
   PAGE META
───────────────────────────────────────── */
const PAGE_META = {
  dashboard: { title: 'Dashboard',     subtitle: 'Your real-time transport summary' },
  track:     { title: 'Track Trotro',  subtitle: 'Live vehicle positions on your route' },
  fare:      { title: 'Fare Estimate', subtitle: 'Calculate your journey cost instantly' },
  parcel:    { title: 'Send Parcel',   subtitle: 'Schedule a parcel along a trotro route' },
  status:    { title: 'Parcel Status', subtitle: 'Track and manage your deliveries' },
};

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + name);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  const meta = PAGE_META[name] || {};
  document.getElementById('page-title').textContent    = meta.title    || name;
  document.getElementById('page-subtitle').textContent = meta.subtitle || '';

  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
let _toastTimer;

function showToast(msg, type) {
  const el    = document.getElementById('toast');
  const color = type === 'error'   ? '#ff6b6b'
              : type === 'success' ? '#00c9a7'
              : 'var(--amber)';
  el.style.borderLeftColor            = color;
  el.querySelector('svg').style.color = color;
  document.getElementById('toast-msg').textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
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
   SECTION 1 — DASHBOARD
   ─ loadRoutes()        → GET /api/routes
     Fills #routes-container stat card.
     Also populates the Track Trotro dropdown.
     Seeded data: 4 active routes.

   ─ loadVehicles()      → GET /api/tracking/nearby (geolocation)
     Falls back to GET /api/drivers/online if
     geolocation is denied.
     Fills #vehicles-container stat card.
     Seeded data: 2 online drivers.

   ─ loadDashboardParcels() → GET /api/parcels/my-deliveries
     Fills #parcels-container, #activity-container,
     #parcel-summary-container, and pre-fills
     the full parcel status table.
     Seeded data: 5 parcels for the logged-in passenger.
═════════════════════════════════════════ */
function loadRoutes() {
  apiFetch('/routes')
    .then(r => r.json())
    .then(data => {
      const routes = data.data || [];

      const el = document.getElementById('routes-container');
      el.textContent = routes.length;
      el.classList.remove('loading');

      // Populate Track Trotro route dropdown
      const select = document.getElementById('route-select');
      if (select && routes.length) {
        select.innerHTML =
          '<option value="">— Choose a route —</option>' +
          routes.map(r =>
            `<option value="${r.id}">${r.route_name} (${r.start_location} → ${r.end_location})</option>`
          ).join('');
      }
    })
    .catch(() => {
      const el = document.getElementById('routes-container');
      el.textContent = '—';
      el.classList.remove('loading');
    });
}

function loadVehicles() {
  const el = document.getElementById('vehicles-container');

  function setCount(data) {
    el.textContent = (data.data || []).length;
    el.classList.remove('loading');
  }
  function fallback() {
    el.textContent = '—';
    el.classList.remove('loading');
  }

  if (!navigator.geolocation) {
    // No geolocation — show all online drivers from seed
    apiFetch('/drivers/online').then(r => r.json()).then(setCount).catch(fallback);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      apiFetch(`/tracking/nearby?lat=${coords.latitude}&lng=${coords.longitude}`)
        .then(r => r.json())
        .then(setCount)
        .catch(fallback);
    },
    () => {
      // Permission denied — fall back to all online drivers
      apiFetch('/drivers/online').then(r => r.json()).then(setCount).catch(fallback);
    }
  );
}

function loadDashboardParcels() {
  apiFetch('/parcels/my-deliveries')
    .then(r => r.json())
    .then(data => {
      const parcels = data.data || [];

      // Parcel count stat card
      const countEl = document.getElementById('parcels-container');
      countEl.textContent = parcels.length;
      countEl.classList.remove('loading');

      // Activity stat card — parcels from the last 7 days
      const cutoff      = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentCount = parcels.filter(
        p => new Date(p.created_at).getTime() > cutoff
      ).length;
      const actEl = document.getElementById('activity-container');
      actEl.textContent = recentCount + ' this week';
      actEl.classList.remove('loading');

      // Parcel summary card — latest 4 rows
      if (parcels.length > 0) {
        const summaryEl = document.getElementById('parcel-summary-container');
        summaryEl.innerHTML = parcels.slice(0, 4).map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:10px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:0.82rem;font-weight:600;color:var(--text-head)">
                ${p.pickup_location} → ${p.drop_location}
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">
                ${new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>
            <span class="badge ${(p.status || '').replace('_', '-')}">
              ${(p.status || '').replace('_', ' ')}
            </span>
          </div>`).join('');
      }

      // Pre-populate the Parcel Status table
      renderParcelTable(parcels);
    })
    .catch(() => {
      ['parcels-container', 'activity-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = '—'; el.classList.remove('loading'); }
      });
    });
}

/* ═════════════════════════════════════════
   SECTION 2 — TRACK TROTRO
   GET /api/tracking/route/:routeId
   Fills: vehicle-id, vehicle-route,
          vehicle-location, vehicle-eta
   Seeded data: Kojo Appiah on route 1,
                Fiifi Aidoo on route 2.
═════════════════════════════════════════ */
function trackVehicle() {
  const select  = document.getElementById('route-select');
  const routeId = select.value;
  if (!routeId) { showToast('Please select a route first.', 'error'); return; }

  showToast('Fetching live vehicles…');

  apiFetch(`/tracking/route/${routeId}`)
    .then(r => r.json())
    .then(data => {
      const vehicles = data.data || [];

      if (!vehicles.length) {
        showToast('No active vehicles on this route right now.', 'error');
        ['vehicle-id', 'vehicle-route', 'vehicle-location', 'vehicle-eta']
          .forEach(id => { document.getElementById(id).textContent = '—'; });
        return;
      }

      const v = vehicles[0];
      document.getElementById('vehicle-id').textContent =
        v.vehicle_number || '—';
      document.getElementById('vehicle-route').textContent =
        select.selectedOptions[0]?.text || '—';
      document.getElementById('vehicle-location').textContent =
        v.latitude && v.longitude
          ? `${Number(v.latitude).toFixed(5)}, ${Number(v.longitude).toFixed(5)}`
          : '—';
      document.getElementById('vehicle-eta').textContent = '—';

      showToast(
        `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''} found on this route.`,
        'success'
      );
    })
    .catch(() => showToast('Could not reach tracking service.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 3 — FARE ESTIMATE
   POST /api/fare/estimate
   Body: { pickup, destination }
   Seeded fare rules:
     Circle–Madina  GH₵3.50 base + GH₵0.30/km
     Kaneshie–Tema  GH₵5.00 base + GH₵0.35/km
     Accra–Legon    GH₵4.00 base + GH₵0.32/km
     Achimota–Adenta GH₵3.00 base + GH₵0.28/km
═════════════════════════════════════════ */
function estimateFare() {
  const pickup = document.getElementById('pickup-location').value.trim();
  const dest   = document.getElementById('destination').value.trim();

  if (!pickup || !dest) {
    showToast('Please enter both pickup and destination.', 'error');
    return;
  }

  const resultEl = document.getElementById('fare-result-container');
  resultEl.innerHTML =
    `<p style="color:var(--text-muted);font-size:0.85rem">Calculating…</p>`;

  apiFetch('/fare/estimate', {
    method: 'POST',
    body:   JSON.stringify({ pickup, destination: dest }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || 'Estimate failed.', 'error');
        return;
      }
      const d = data.data;
      resultEl.innerHTML = `
        <div style="text-align:center;width:100%">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;
                      letter-spacing:0.9px;color:var(--text-muted);margin-bottom:10px">
            Estimated Fare
          </div>
          <div style="font-size:2.8rem;font-weight:800;color:var(--text-head);
                      font-family:'DM Mono',monospace;line-height:1">
            GH&#8373;&nbsp;${d.estimatedFare}
          </div>
          ${d.routeName
            ? `<div style="font-size:0.84rem;color:var(--text-muted);margin-top:12px">
                 Route: <strong>${d.routeName}</strong>
               </div>`
            : ''}
          ${d.baseFare
            ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">
                 Base: GH&#8373;&nbsp;${d.baseFare} + GH&#8373;&nbsp;${d.perKmRate}/km
               </div>`
            : ''}
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:16px;
                      padding:10px 16px;background:var(--surface);border-radius:8px">
            ${d.note || 'Actual fare may vary by driver.'}
          </div>
        </div>`;
      showToast('Fare estimate ready.', 'success');
    })
    .catch(() => {
      resultEl.innerHTML =
        `<p style="color:var(--red-soft);font-size:0.85rem">
           Could not reach server. Try again.
         </p>`;
    });
}

/* ═════════════════════════════════════════
   SECTION 4 — SEND PARCEL
   POST /api/parcels
   Body: { pickupLocation, dropLocation, description, receiverContact }
   On success: clears form, shows parcel ID toast,
               refreshes dashboard counts,
               navigates to Parcel Status after 1.2s.
═════════════════════════════════════════ */
function submitParcelRequest() {
  const pickup      = document.getElementById('parcel-pickup').value.trim();
  const drop        = document.getElementById('parcel-drop').value.trim();
  const description = document.getElementById('parcel-description').value.trim();
  const contact     = document.getElementById('receiver-contact').value.trim();

  if (!pickup || !drop || !description || !contact) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  apiFetch('/parcels', {
    method: 'POST',
    body:   JSON.stringify({
      pickupLocation:  pickup,
      dropLocation:    drop,
      description,
      receiverContact: contact,
    }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || 'Submission failed.', 'error');
        return;
      }
      // Clear form fields
      ['parcel-pickup', 'parcel-drop', 'parcel-description', 'receiver-contact']
        .forEach(id => { document.getElementById(id).value = ''; });

      showToast(`Parcel submitted! ID: ${data.data.id}`, 'success');

      // Refresh counts then navigate to status tab
      loadDashboardParcels();
      setTimeout(() => showSection('status'), 1200);
    })
    .catch(() => showToast('Could not reach server. Try again.', 'error'));
}

/* ═════════════════════════════════════════
   SECTION 5 — PARCEL STATUS
   GET /api/parcels/status/:id
   Also pre-populated from loadDashboardParcels().
   Seeded parcels include all 5 statuses:
   delivered, picked_up, accepted, pending (×2).
═════════════════════════════════════════ */
function renderParcelTable(parcels) {
  const tbody   = document.getElementById('parcel-status-body');
  const emptyEl = document.getElementById('parcel-table-empty');
  if (!tbody) return;

  if (!parcels || parcels.length === 0) {
    tbody.innerHTML       = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  tbody.innerHTML = parcels.map(p => {
    const statusClass = (p.status || '').replace('_', '-');
    const statusLabel = (p.status || '—').replace(/_/g, ' ');
    return `
      <tr>
        <td>
          <code style="font-family:'DM Mono',monospace;font-size:0.78rem">
            ${p.id}
          </code>
        </td>
        <td>${p.pickup_location}</td>
        <td>${p.drop_location}</td>
        <td>${p.driver_name || '—'}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>${p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</td>
      </tr>`;
  }).join('');
}

function trackParcel() {
  const parcelId = document.getElementById('parcel-id-input').value.trim();
  if (!parcelId) { showToast('Please enter a Parcel ID.', 'error'); return; }

  showToast('Searching for parcel…');

  apiFetch(`/parcels/status/${parcelId}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        showToast(data.message || 'Parcel not found.', 'error');
        return;
      }
      renderParcelTable([data.data]);
      showToast('Parcel found.', 'success');
    })
    .catch(() => showToast('Could not reach server. Try again.', 'error'));
}

/* ─────────────────────────────────────────
   ACTION DISPATCH
───────────────────────────────────────── */
const ACTIONS = {
  'track-vehicle':  trackVehicle,
  'estimate-fare':  estimateFare,
  'submit-parcel':  submitParcelRequest,
  'track-parcel':   trackParcel,
};

/* ═════════════════════════════════════════
   INIT
═════════════════════════════════════════ */
(function init() {

  // Inject user name and initials from localStorage into UI
  if (_user) {
    const initials = ((_user.first_name || 'P')[0] + (_user.last_name || '')[0]).toUpperCase();
    const fullName = `${_user.first_name || ''} ${_user.last_name || ''}`.trim() || 'Passenger';
    const els = {
      'sidebar-avatar':  initials,
      'sidebar-name':    fullName,
      'header-avatar':   initials,
      'page-subtitle':   `Welcome back, ${_user.first_name || 'Passenger'}`,
    };
    Object.entries(els).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }

  // Sidebar nav tabs
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  // Dashboard "View All" buttons (data-goto)
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.goto));
  });

  // Feature action buttons (data-action)
  document.querySelectorAll('[data-action]').forEach(btn => {
    const handler = ACTIONS[btn.dataset.action];
    if (handler) btn.addEventListener('click', handler);
  });

  // Hamburger
  const hamburger = document.getElementById('hamburger-btn');
  if (hamburger) hamburger.addEventListener('click', toggleSidebar);

  // Overlay closes sidebar
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar();
  });

  // ── Initial data load ────────────────────────────────────────────────────
  loadRoutes();           // fills Active Routes card + route dropdown
  loadVehicles();         // fills Nearby Vehicles card
  loadDashboardParcels(); // fills My Parcels, Activity, summary card, status table

})();