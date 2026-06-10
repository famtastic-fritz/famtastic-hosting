<script lang="ts">
  import { writable } from 'svelte/store';

  let formElement: HTMLFormElement;
  let loading = false;
  let success = false;
  let error: string | null = null;

  // Form state
  let name = '';
  let email = '';
  let subject = 'General';
  let message = '';
  let honeypot = '';

  // Error messages
  let fieldErrors: Record<string, string> = {};

  function validateForm(): boolean {
    fieldErrors = {};

    if (!name.trim()) {
      fieldErrors['name'] = 'Name is required';
    }

    if (!email.trim()) {
      fieldErrors['email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors['email'] = 'Please enter a valid email';
    }

    if (!message.trim()) {
      fieldErrors['message'] = 'Message is required';
    } else if (message.trim().length < 10) {
      fieldErrors['message'] = 'Message must be at least 10 characters';
    }

    return Object.keys(fieldErrors).length === 0;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    loading = true;
    error = null;
    success = false;

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('subject', subject);
      formData.append('message', message);
      formData.append('honeypot', honeypot);

      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        success = true;
        // Reset form
        name = '';
        email = '';
        subject = 'General';
        message = '';
        honeypot = '';
        fieldErrors = {};
        formElement?.reset();

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          success = false;
        }, 5000);
      } else {
        error = result.error || 'Failed to send message. Please try again.';
      }
    } catch (err) {
      error = 'An error occurred. Please try again.';
      console.error('Contact form error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="contact-form-wrapper">
  <form bind:this={formElement} on:submit={handleSubmit} class="contact-form">
    <!-- Success message -->
    {#if success}
      <div class="form-message success">
        <span>Thank you! Your message has been sent. We'll get back to you soon.</span>
      </div>
    {/if}

    <!-- Error message -->
    {#if error}
      <div class="form-message error">
        <span>{error}</span>
      </div>
    {/if}

    <!-- Name field -->
    <div class="form-group">
      <label for="contact-name">Name</label>
      <input
        id="contact-name"
        type="text"
        name="name"
        bind:value={name}
        placeholder="Your name"
        disabled={loading}
        class:error={fieldErrors['name']}
      />
      {#if fieldErrors['name']}
        <span class="field-error">{fieldErrors['name']}</span>
      {/if}
    </div>

    <!-- Email field -->
    <div class="form-group">
      <label for="contact-email">Email</label>
      <input
        id="contact-email"
        type="email"
        name="email"
        bind:value={email}
        placeholder="you@example.com"
        disabled={loading}
        class:error={fieldErrors['email']}
      />
      {#if fieldErrors['email']}
        <span class="field-error">{fieldErrors['email']}</span>
      {/if}
    </div>

    <!-- Subject dropdown -->
    <div class="form-group">
      <label for="contact-subject">Subject</label>
      <select
        id="contact-subject"
        name="subject"
        bind:value={subject}
        disabled={loading}
      >
        <option value="General">General Inquiry</option>
        <option value="Billing">Billing Question</option>
        <option value="Technical">Technical Support</option>
        <option value="Sales">Sales Inquiry</option>
      </select>
    </div>

    <!-- Message field -->
    <div class="form-group">
      <label for="contact-message">Message</label>
      <textarea
        id="contact-message"
        name="message"
        bind:value={message}
        placeholder="Tell us how we can help..."
        rows="5"
        disabled={loading}
        class:error={fieldErrors['message']}
      ></textarea>
      {#if fieldErrors['message']}
        <span class="field-error">{fieldErrors['message']}</span>
      {/if}
    </div>

    <!-- Honeypot field (hidden from users) -->
    <input
      type="text"
      name="honeypot"
      bind:value={honeypot}
      style="display: none;"
      tabindex="-1"
      autocomplete="off"
      aria-hidden="true"
    />

    <!-- Submit button -->
    <div class="form-actions">
      <button type="submit" disabled={loading} class="btn-submit">
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </div>

    <!-- Phone fallback -->
    <div class="form-fallback">
      <p>Or call us at <a href="tel:+14806242500">(480) 624-2500</a></p>
    </div>
  </form>
</div>

<style>
  .contact-form-wrapper {
    width: 100%;
  }

  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-message {
    padding: 1rem;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .form-message.success {
    background-color: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #86efac;
  }

  .form-message.error {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.95rem;
    font-weight: 500;
    color: #f5f5f0;
    font-family: var(--font-body, 'DM Sans', sans-serif);
  }

  input,
  select,
  textarea {
    padding: 0.75rem;
    border: 1px solid rgba(124, 58, 237, 0.3);
    border-radius: 0.375rem;
    background-color: rgba(22, 22, 32, 0.6);
    color: #f5f5f0;
    font-family: var(--font-body, 'DM Sans', sans-serif);
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #7c3aed;
    background-color: rgba(22, 22, 32, 0.9);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  input.error,
  textarea.error {
    border-color: #ef4444;
  }

  textarea {
    resize: vertical;
    font-size: 0.95rem;
  }

  .field-error {
    font-size: 0.85rem;
    color: #fca5a5;
    margin-top: -0.25rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .btn-submit {
    padding: 0.75rem 1.5rem;
    background-color: #7c3aed;
    color: #f5f5f0;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-body, 'DM Sans', sans-serif);
  }

  .btn-submit:hover:not(:disabled) {
    background-color: #6d28d9;
    transform: translateY(-1px);
  }

  .btn-submit:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-fallback {
    text-align: center;
    padding: 1rem 0;
    border-top: 1px solid rgba(124, 58, 237, 0.2);
  }

  .form-fallback p {
    font-size: 0.9rem;
    color: rgba(245, 245, 240, 0.7);
    margin: 0;
  }

  .form-fallback a {
    color: #7c3aed;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .form-fallback a:hover {
    color: #84cc16;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .contact-form {
      gap: 1.25rem;
    }

    input,
    select,
    textarea {
      font-size: 16px; /* Prevents auto-zoom on iOS */
    }
  }
</style>
