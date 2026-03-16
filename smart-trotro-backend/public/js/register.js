// register.js
'use strict';

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Element references ──────────────────────────────────────────────────── */
  const form            = document.getElementById('registerForm');
  const firstName       = document.getElementById('firstName');
  const lastName        = document.getElementById('lastName');
  const email           = document.getElementById('email');
  const phone           = document.getElementById('phone');
  const password        = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const terms           = document.getElementById('terms');
  const submitBtn       = document.getElementById('submitBtn');
  const togglePassword  = document.getElementById('togglePassword');
  const strengthFill    = document.getElementById('strengthFill');
  const strengthText    = document.getElementById('strengthText');

  // Abort early if the form isn't on this page
  if (!form) return;

  let selectedRole = 'passenger';

  /* ── Role tabs ───────────────────────────────────────────────────────────── */
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role || 'passenger';

      safeToggle('driverFields', selectedRole === 'driver');
      safeToggle('adminBadge',   selectedRole === 'admin');
      safeToggle('adminFields',  selectedRole === 'admin');

      hideBanner();
      // Clear role-specific field errors when switching away
      clearRoleFieldErrors();
    });
  });

  /* ── Password visibility toggle ──────────────────────────────────────────── */
  if (togglePassword) {
    togglePassword.addEventListener('click', () => {
      const isHidden = password.type === 'password';
      password.type  = isHidden ? 'text' : 'password';
      togglePassword.innerHTML = isHidden
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                      a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1
                      12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
                      m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`;
    });
  }

  /* ── Password strength meter ─────────────────────────────────────────────── */
  if (password && strengthFill && strengthText) {
    password.addEventListener('input', updateStrength);
  }

  function updateStrength() {
    const val = password.value;
    let score = 0;
    if (val.length >= 8)           score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val))  score++;

    const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#059669'];
    const labels = ['',        'Weak',    'Fair',    'Good',    'Strong' ];
    const widths = ['0%',      '25%',     '50%',     '75%',     '100%'  ];

    strengthFill.style.width      = widths[score];
    strengthFill.style.background = colors[score];
    strengthText.textContent      = labels[score];
    strengthText.style.color      = colors[score];
  }

  /* ── Generic validation helper ───────────────────────────────────────────── */
  // Returns true/false and toggles error message visibility.
  // Silently returns true (no error) when the element doesn't exist in the DOM.
  function validate(inputEl, errorId, condition) {
    if (!inputEl) return true; // element not rendered — skip silently

    const errorEl = document.getElementById(errorId);

    if (!condition) {
      inputEl.classList.add('error');
      inputEl.classList.remove('success');
      if (errorEl) errorEl.classList.add('show');
      return false;
    }

    inputEl.classList.remove('error');
    inputEl.classList.add('success');
    if (errorEl) errorEl.classList.remove('show');
    return true;
  }

  /* ── Terms checkbox helper ───────────────────────────────────────────────── */
  function validateTerms() {
    const errorEl = document.getElementById('termsError');
    const checked = terms ? terms.checked : false;
    if (errorEl) errorEl.classList.toggle('show', !checked);
    return checked;
  }

  /* ── Role-specific field validation ─────────────────────────────────────── */
  //
  // Each entry: { inputId, errorId, test }
  // test receives the trimmed value and returns true/false.
  //
  const ROLE_FIELDS = {
    driver: [
      {
        inputId: 'vehicleReg',
        errorId: 'vehicleRegError',
        test:    val => val.length >= 2,
        label:   'Vehicle registration number is required',
      },
      {
        inputId: 'route',
        errorId: 'routeError',
        test:    val => val.length >= 2,
        label:   'Primary route is required',
      },
    ],
    admin: [
      {
        inputId: 'organisation',
        errorId: 'organisationError',
        test:    val => val.length >= 2,
        label:   'Organisation is required',
      },
    ],
  };

  function validateRoleFields(role) {
    const fields = ROLE_FIELDS[role];
    if (!fields) return true; // passenger — no extra fields

    return fields.every(({ inputId, errorId, test }) => {
      const inputEl = document.getElementById(inputId);
      if (!inputEl) {
        // Field not in DOM — warn but don't block submission
        console.warn(`[register] Expected field #${inputId} for role "${role}" not found in DOM.`);
        return true;
      }
      return validate(inputEl, errorId, test(inputEl.value.trim()));
    });
  }

  function clearRoleFieldErrors() {
    Object.values(ROLE_FIELDS).flat().forEach(({ inputId, errorId }) => {
      const inputEl  = document.getElementById(inputId);
      const errorEl  = document.getElementById(errorId);
      if (inputEl) { inputEl.classList.remove('error', 'success'); }
      if (errorEl) { errorEl.classList.remove('show'); }
    });
  }

  /* ── Real-time field listeners ───────────────────────────────────────────── */
  const FIELD_RULES = [
    { el: firstName,       errorId: 'firstNameError',   test: v => v.trim().length >= 2 },
    { el: lastName,        errorId: 'lastNameError',    test: v => v.trim().length >= 2 },
    { el: email,           errorId: 'emailError',       test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    { el: phone,           errorId: 'phoneError',       test: v => v.replace(/\D/g, '').length >= 10 },
    { el: password,        errorId: 'passwordError',    test: v => v.length >= 8 },
    { el: confirmPassword, errorId: 'confirmError',
      test: v => v === password.value && v.length > 0 },
  ];

  FIELD_RULES.forEach(({ el, errorId, test }) => {
    if (!el) return;
    el.addEventListener('input', () => validate(el, errorId, test(el.value)));
  });

  // Also re-validate confirmPassword whenever password changes
  if (password && confirmPassword) {
    password.addEventListener('input', () => {
      if (confirmPassword.value.length > 0) {
        validate(confirmPassword, 'confirmError',
          confirmPassword.value === password.value);
      }
    });
  }

  /* ── Banner helpers ──────────────────────────────────────────────────────── */
  function showBanner(message, type = 'error') {
    let banner = document.getElementById('reg-banner');

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'reg-banner';
      banner.style.cssText = [
        'border-radius:10px', 'padding:12px 16px', 'font-size:0.88rem',
        'font-weight:500',    'margin-bottom:20px', 'display:flex',
        'align-items:center', 'gap:8px',
      ].join(';');
      banner.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" style="flex-shrink:0">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8"  x2="12"    y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="reg-banner-text"></span>`;
      form.prepend(banner);
    }

    const isSuccess = type === 'success';
    banner.style.background = isSuccess ? '#f0fdf4'         : '#fef2f2';
    banner.style.color      = isSuccess ? '#15803d'         : '#b91c1c';
    banner.style.border     = isSuccess ? '1px solid #bbf7d0' : '1px solid #fecaca';
    banner.querySelector('svg').setAttribute('stroke', isSuccess ? '#15803d' : '#b91c1c');

    const textEl = document.getElementById('reg-banner-text');
    if (textEl) textEl.textContent = message;
    banner.style.display = 'flex';
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideBanner() {
    const banner = document.getElementById('reg-banner');
    if (banner) banner.style.display = 'none';
  }

  /* ── Loading state ───────────────────────────────────────────────────────── */
  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    const textEl    = submitBtn.querySelector('.btn-text');
    const spinnerEl = submitBtn.querySelector('.spinner');
    if (textEl)    textEl.textContent       = loading ? 'Creating account…' : 'Create Account';
    if (spinnerEl) spinnerEl.style.display  = loading ? 'block' : 'none';
  }

  /* ── Build payload ───────────────────────────────────────────────────────── */
  function buildPayload() {
    const payload = {
      firstName: firstName.value.trim(),
      lastName:  lastName.value.trim(),
      email:     email.value.trim().toLowerCase(),
      phone:     phone.value.trim(),
      password:  password.value,
      role:      selectedRole,
    };

    if (selectedRole === 'driver') {
      payload.vehicleNumber  = (document.getElementById('vehicleReg')?.value  || '').trim();
      payload.primaryRouteId = (document.getElementById('route')?.value        || '').trim() || null;
    }

    if (selectedRole === 'admin') {
      payload.organisation = (document.getElementById('organisation')?.value || '').trim();
      payload.accessCode   = (document.getElementById('adminCode')?.value    || '').trim();
    }

    return payload;
  }

  /* ── Redirect map ────────────────────────────────────────────────────────── */
  const POST_REGISTER_REDIRECT = {
    passenger: 'login.html',
    driver:    'login.html',
    admin:     'login.html',
  };

  /* ── DOM toggle helper ───────────────────────────────────────────────────── */
  function safeToggle(elementId, condition) {
    const el = document.getElementById(elementId);
    if (el) el.classList.toggle('active', condition);
  }

  /* ── Form submit ─────────────────────────────────────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner();

    // ── 1. Validate all common fields
    const commonValid = [
      validate(firstName,       'firstNameError', firstName.value.trim().length >= 2),
      validate(lastName,        'lastNameError',  lastName.value.trim().length >= 2),
      validate(email,           'emailError',     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)),
      validate(phone,           'phoneError',     phone.value.replace(/\D/g, '').length >= 10),
      validate(password,        'passwordError',  password.value.length >= 8),
      validate(confirmPassword, 'confirmError',
        confirmPassword.value === password.value && confirmPassword.value.length > 0),
    ].every(Boolean);

    // ── 2. Validate terms checkbox
    const termsValid = validateTerms();

    // ── 3. Validate role-specific fields (driver, admin)
    const roleValid = validateRoleFields(selectedRole);

    // ── 4. Stop if anything failed
    if (!commonValid || !termsValid || !roleValid) return;

    // ── 5. Submit
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showBanner(data.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // ── Success
      const successMsg = selectedRole === 'admin'
        ? 'Admin account submitted! Our team will review and activate it shortly. Redirecting to login…'
        : 'Account created successfully! Redirecting to login…';

      showBanner(successMsg, 'success');
      setLoading(false);

      setTimeout(() => {
        window.location.href = POST_REGISTER_REDIRECT[selectedRole] || 'login.html';
      }, 2500);

    } catch (err) {
      console.error('[register] Network error:', err);
      showBanner('Unable to reach the server. Check your connection and try again.');
      setLoading(false);
    }
  });



  async function loadRoutesDropdown() {
  try {
    const res = await fetch('/api/routes/active');
    const data = await res.json();
    const select = document.getElementById('routeSelect');
    if (data.success) {
      data.routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;           // UUID for FK
        option.textContent = route.route_name;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Failed to load routes:', err);
  }
}

// Call on page load
loadRoutesDropdown();

}); // end DOMContentLoaded