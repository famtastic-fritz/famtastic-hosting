#!/usr/bin/env node
/**
 * FAMtastic Hosting — Node.js entry point for cPanel deployment.
 *
 * Runs the Astro standalone server on a local port.
 * Apache .htaccess proxies dynamic requests to this server.
 *
 * Usage:
 *   node server.mjs
 *   PORT=3001 node server.mjs  (default: 3001)
 */

import { startServer } from './dist/server/entry.mjs';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '127.0.0.1';

startServer({
  port: PORT,
  host: HOST,
});