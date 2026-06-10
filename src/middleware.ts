import { defineMiddleware } from 'astro:middleware';
import { extractSession } from './lib/auth/middleware.js';
import type { AuthUser } from './lib/auth/middleware.js';

// Public dashboard pages — no auth needed
const PUBLIC_DASHBOARD = new Set([
  '/dashboard/login',
  '/dashboard/register',
]);

// Public admin pages — no auth needed
const PUBLIC_ADMIN = new Set([
  '/admin/login',
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);

  // Skip API routes — they handle auth internally and return JSON 401s
  if (pathname.startsWith('/api/')) {
    return next();
  }

  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  // Public pages — extract session if present (for nav/UI), but don't gate
  if (PUBLIC_DASHBOARD.has(pathname) || PUBLIC_ADMIN.has(pathname)) {
    const user = await extractSession(context.request);
    if (user) context.locals.user = user;
    return next();
  }

  // Static / public site routes — pass through
  if (!isDashboard && !isAdmin) {
    return next();
  }

  // Protected route — must have valid session
  const user: AuthUser | null = await extractSession(context.request);

  if (!user) {
    const loginUrl = isAdmin ? '/admin/login' : '/dashboard/login';
    return context.redirect(loginUrl, 302);
  }

  if (isAdmin && user.role !== 'admin') {
    return context.redirect('/admin/login', 302);
  }

  context.locals.user = user;
  return next();
});
