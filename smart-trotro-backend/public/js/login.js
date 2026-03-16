'use strict';

const API_BASE = 'http://localhost:5000/api';
const form          = document.getElementById('loginForm');
const emailInput    = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn     = document.getElementById('submitBtn');
const togglePassword = document.getElementById('togglePassword');

/* ── Password visibility toggle ─────────────────────────── */
togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
});

/* ── Inline validation ──────────────────────────────────── */
function validate(input, errorId, condition) {
  const error = document.getElementById(errorId);
  if (!condition) {
    input.classList.add('error');
    error.classList.add('show');
    return false;
  }
  input.classList.remove('error');
  error.classList.remove('show');
  return true;
}

emailInput.addEventListener('input', () =>
  validate(emailInput, 'emailError', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value))
);
passwordInput.addEventListener('input', () =>
  validate(passwordInput, 'passwordError', passwordInput.value.length >= 6)
);

/* ── Show/hide error banner ─────────────────────────────── */
function showBanner(message) {
  let banner = document.getElementById('login-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'login-error-banner';
    banner.style.cssText = `
      background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;
      border-radius:10px; padding:12px 16px; font-size:0.88rem;
      font-weight:500; margin-bottom:20px; display:flex;
      align-items:center; gap:8px;
    `;
    banner.innerHTML = `<span id="login-error-text"></span>`;
    form.prepend(banner);
  }
  document.getElementById('login-error-text').textContent = message;
  banner.style.display = 'flex';
}

function hideBanner() {
  const banner = document.getElementById('login-error-banner');
  if (banner) banner.style.display = 'none';
}

/* ── Loading state ────────────────────────────────────── */
function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.querySelector('.btn-text').textContent = loading ? 'Signing in…' : 'Sign In';
  submitBtn.querySelector('.spinner').style.display = loading ? 'block' : 'none';
}

/* ── Role → dashboard mapping ─────────────────────────── */
const DASHBOARD = {
  passenger: 'passenger-dashboard.html',
  driver:    'driver-dashboard.html',
  admin:     'admin-dashboard.html',
};

/* ── Form submit ──────────────────────────────────────── */
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideBanner();

  const v1 = validate(emailInput, 'emailError', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value));
  const v2 = validate(passwordInput, 'passwordError', passwordInput.value.length >= 6);
  if (!v1 || !v2) return;

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showBanner(data.message || 'Login failed. Please try again.');
      setLoading(false);
      return;
    }

    const { token, user } = data.data;

    console.log('Login response user.role =', user.role);

    localStorage.setItem('st_token', token);
    localStorage.setItem('st_user', JSON.stringify(user));
    if (document.getElementById('remember')?.checked) {
      localStorage.setItem('st_remember', 'true');
    }

    // Redirect
    window.location.href = DASHBOARD[user.role] || 'index.html';

  } catch (err) {
    showBanner('Unable to reach the server. Check your connection and try again.');
    setLoading(false);
  }
});