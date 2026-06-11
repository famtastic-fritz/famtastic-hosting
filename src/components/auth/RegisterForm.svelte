<script lang="ts">
  /**
   * RegisterForm.svelte
   *
   * Customer registration form. Calls POST /api/auth/register.
   * On success, redirects to /dashboard.
   */

  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let fieldErrors: { email?: string; password?: string; confirmPassword?: string } = {};

  const MIN_PW = 8;

  function validate(): boolean {
    fieldErrors = {};
    if (!email) fieldErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Enter a valid email address.';

    if (!password) fieldErrors.password = 'Password is required.';
    else if (password.length < MIN_PW) fieldErrors.password = `At least ${MIN_PW} characters required.`;

    if (!confirmPassword) fieldErrors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) fieldErrors.confirmPassword = 'Passwords do not match.';

    return Object.keys(fieldErrors).length === 0;
  }

  // Password strength indicator
  $: strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  $: strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][strength] ?? '';
  $: strengthColor = ['', '#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#10b981'][strength] ?? '';

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await res.json() as {
        success: boolean;
        sessionToken?: string;
        error?: string;
      };

      if (!data.success) {
        if (data.error?.includes('already')) {
          fieldErrors.email = 'An account with this email already exists.';
        } else {
          error = data.error ?? 'Registration failed. Please try again.';
        }
        return;
      }

      // Redirect to dashboard on success
      window.location.href = '/dashboard';
    } catch {
      error = 'A network error occurred. Please check your connection.';
    } finally {
      loading = false;
    }
  }
</script>

<form class="register-form" on:submit={handleSubmit} novalidate aria-label="Create account">
  {#if error}
    <div class="form-error" role="alert">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {error}
    </div>
  {/if}

  <div class="field-group">
    <label for="email" class="field-label">Email address</label>
    <input
      id="email"
      type="email"
      class="field-input"
      class:field-input--error={fieldErrors.email}
      bind:value={email}
      autocomplete="email"
      placeholder="you@example.com"
      disabled={loading}
      required
    />
    {#if fieldErrors.email}
      <span class="field-hint field-hint--error">{fieldErrors.email}</span>
    {:else}
      <span class="field-hint">You'll use this to log into your portal.</span>
    {/if}
  </div>

  <div class="field-group">
    <label for="password" class="field-label">Password</label>
    <input
      id="password"
      type="password"
      class="field-input"
      class:field-input--error={fieldErrors.password}
      bind:value={password}
      autocomplete="new-password"
      placeholder="Create a strong password"
      disabled={loading}
      required
    />
    {#if password}
      <div class="strength-bar" aria-label="Password strength: {strengthLabel}">
        <div class="strength-track">
          {#each Array(5) as _, i}
            <div
              class="strength-segment"
              style="background: {i < strength ? strengthColor : '#2a2a38'}"
            ></div>
          {/each}
        </div>
        <span class="strength-label" style="color: {strengthColor}">{strengthLabel}</span>
      </div>
    {/if}
    {#if fieldErrors.password}
      <span class="field-hint field-hint--error">{fieldErrors.password}</span>
    {/if}
  </div>

  <div class="field-group">
    <label for="confirm-password" class="field-label">Confirm password</label>
    <input
      id="confirm-password"
      type="password"
      class="field-input"
      class:field-input--error={fieldErrors.confirmPassword}
      bind:value={confirmPassword}
      autocomplete="new-password"
      placeholder="Repeat your password"
      disabled={loading}
      required
    />
    {#if fieldErrors.confirmPassword}
      <span class="field-hint field-hint--error">{fieldErrors.confirmPassword}</span>
    {/if}
  </div>

  <button type="submit" class="btn-submit" disabled={loading} aria-busy={loading}>
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
      Creating account…
    {:else}
      Create account
    {/if}
  </button>

  <p class="form-footer">
    Already have an account?
    <a href="/dashboard/login" class="form-link">Sign in.</a>
  </p>

  <p class="form-legal">
    By creating an account you agree to our
    <a href="/terms" class="form-link">Terms of Service</a>
    and <a href="/privacy" class="form-link">Privacy Policy</a>.
  </p>
</form>

<style>
  .register-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #c4c4d0;
    font-family: 'DM Sans', sans-serif;
  }

  .field-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: #0e0e14;
    border: 1px solid #2a2a38;
    border-radius: 8px;
    color: #f5f5f0;
    font-size: 0.9375rem;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;
  }
  .field-input::placeholder { color: #4a4a5a; }
  .field-input:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  }
  .field-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .field-input--error { border-color: #ef4444; }
  .field-input--error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }

  .field-hint {
    font-size: 0.8125rem;
    color: #9090a0;
  }
  .field-hint--error { color: #fca5a5; }

  /* ── Password strength ────────────────────────────────────── */
  .strength-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.125rem;
  }
  .strength-track {
    display: flex;
    gap: 3px;
    flex: 1;
  }
  .strength-segment {
    height: 4px;
    flex: 1;
    border-radius: 2px;
    transition: background 0.2s ease;
  }
  .strength-label {
    font-size: 0.75rem;
    font-weight: 500;
    min-width: 4.5rem;
    text-align: right;
    transition: color 0.2s ease;
  }

  /* ── Submit button ────────────────────────────────────────── */
  .btn-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: #7c3aed;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    font-family: 'Space Grotesk', sans-serif;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
    margin-top: 0.25rem;
  }
  .btn-submit:hover:not(:disabled) { background: #6d28d9; }
  .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer links ─────────────────────────────────────────── */
  .form-footer,
  .form-legal {
    text-align: center;
    font-size: 0.875rem;
    color: #9090a0;
    margin: 0;
  }
  .form-legal { font-size: 0.8125rem; }
  .form-link {
    color: #7c3aed;
    text-decoration: none;
  }
  .form-link:hover { text-decoration: underline; }
</style>
