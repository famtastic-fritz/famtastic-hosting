<script lang="ts">
  /**
   * LoginForm.svelte
   *
   * Customer login form. Calls POST /api/auth/login, handles errors
   * and redirects after successful auth.
   *
   * Props:
   *   redirectTo? — override the server-suggested redirect (default: /dashboard)
   *   adminMode?  — when true, calls /api/auth/admin/login and shows admin copy
   */

  export let redirectTo: string = '';
  export let adminMode: boolean = false;

  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let fieldErrors: { email?: string; password?: string } = {};

  const endpoint = adminMode ? '/api/auth/admin/login' : '/api/auth/login';

  // Client-side validation before submitting
  function validate(): boolean {
    fieldErrors = {};
    if (!email) fieldErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Enter a valid email.';
    if (!password) fieldErrors.password = 'Password is required.';
    return Object.keys(fieldErrors).length === 0;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;

    loading = true;
    error = '';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as {
        success: boolean;
        sessionToken?: string;
        error?: string;
      };

      if (!data.success) {
        error = data.error ?? 'Login failed. Please try again.';
        return;
      }

      // Navigate to dashboard
      const destination = redirectTo || '/dashboard';
      window.location.href = destination;
    } catch (err) {
      error = 'A network error occurred. Please check your connection.';
    } finally {
      loading = false;
    }
  }
</script>

<form class="login-form" on:submit={handleSubmit} novalidate aria-label="Sign in">
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
    {/if}
  </div>

  <div class="field-group">
    <div class="field-label-row">
      <label for="password" class="field-label">Password</label>
      {#if !adminMode}
        <a href="/dashboard/forgot-password" class="field-label-link">Forgot password?</a>
      {/if}
    </div>
    <input
      id="password"
      type="password"
      class="field-input"
      class:field-input--error={fieldErrors.password}
      bind:value={password}
      autocomplete="current-password"
      placeholder="••••••••"
      disabled={loading}
      required
    />
    {#if fieldErrors.password}
      <span class="field-hint field-hint--error">{fieldErrors.password}</span>
    {/if}
  </div>

  <button type="submit" class="btn-submit" disabled={loading} aria-busy={loading}>
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
      Signing in…
    {:else}
      {adminMode ? 'Sign in to Admin' : 'Sign in'}
    {/if}
  </button>

  {#if !adminMode}
    <p class="form-footer">
      Don't have an account?
      <a href="/dashboard/register" class="form-link">Create one — it's free.</a>
    </p>
  {/if}
</form>

<style>
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Error banner ─────────────────────────────────────────── */
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

  /* ── Field groups ─────────────────────────────────────────── */
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

  .field-label-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .field-label-link {
    font-size: 0.8125rem;
    color: #7c3aed;
    text-decoration: none;
  }
  .field-label-link:hover { text-decoration: underline; }

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

  /* ── Spinner ──────────────────────────────────────────────── */
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

  /* ── Footer link ──────────────────────────────────────────── */
  .form-footer {
    text-align: center;
    font-size: 0.875rem;
    color: #9090a0;
    margin: 0;
  }
  .form-link {
    color: #7c3aed;
    text-decoration: none;
  }
  .form-link:hover { text-decoration: underline; }
</style>
