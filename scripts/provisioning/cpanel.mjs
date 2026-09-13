import { createHash, X509Certificate, createPrivateKey } from 'node:crypto';
import { posix } from 'node:path';

const requireValue = (condition, code) => { if (!condition) throw new Error(code); };
const fqdn = value => typeof value === 'string' && value.length <= 253 && value.includes('.')
  && value.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));

export function validateManifest(m) {
  requireValue(m?.schema === 'famtastic.hosting-provision.v1', 'manifest_schema_invalid');
  requireValue(/^[a-z0-9][a-z0-9-]{1,62}$/.test(m.site_id || ''), 'site_id_invalid');
  requireValue(/^drupal:customer:[1-9][0-9]*$/.test(m.customer_ref || ''), 'customer_ref_required');
  requireValue(/^drupal:request:[1-9][0-9]*$/.test(m.request_ref || ''), 'request_ref_required');
  requireValue(fqdn(m.domain), 'domain_invalid');
  requireValue(/^[a-z][a-z0-9]{0,15}$/.test(m.hosting?.account || ''), 'account_invalid');
  requireValue(fqdn(m.hosting?.main_domain) && m.domain !== m.hosting.main_domain, 'main_domain_invalid');
  requireValue(/^[a-z0-9][a-z0-9-]{1,62}$/.test(m.hosting?.subdomain_label || ''), 'subdomain_invalid');
  const root = m.hosting.document_root;
  requireValue(typeof root === 'string' && root === `customer-sites/${m.site_id}/public`
    && posix.normalize(root) === root && !root.split('/').some(part => part === '.' || part === '..' || part.startsWith('.'))
    && !root.endsWith('/'), 'document_root_invalid');
  requireValue(Array.isArray(m.mailboxes), 'mailboxes_required');
  const names = new Set();
  for (const mailbox of m.mailboxes) {
    requireValue(/^[a-z0-9][a-z0-9._-]{0,63}$/.test(mailbox.local_part || ''), 'mailbox_name_invalid');
    requireValue(!names.has(mailbox.local_part), 'duplicate_mailbox'); names.add(mailbox.local_part);
    requireValue(Number.isInteger(mailbox.quota_mb) && mailbox.quota_mb >= 100 && mailbox.quota_mb <= 10240, 'mailbox_quota_invalid');
    requireValue(/^[A-Z][A-Z0-9_]+$/.test(mailbox.password_env || ''), 'mailbox_secret_reference_required');
  }
  return m;
}

// Stable canonical encoding binds approvals to every manifest field, not key order.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = manifest => createHash('sha256').update(canonical(validateManifest(manifest))).digest('hex');

// Technical control is not the customer's registrant identity. Both must be
// evidenced, but only current control plus explicit operation approval permits
// provisioning; an unresolved registrant remains a separate launch gate.
export function hasDomainControl(m, now = Date.now()) {
  const c = m.domain_control;
  const checked = Date.parse(c?.verified_at);
  return c?.status === 'verified' && c.domain === m.domain
    && typeof c.operator === 'string' && c.operator.trim().length > 0
    && typeof c.evidence_ref === 'string' && c.evidence_ref.trim().length > 0
    && Number.isFinite(checked) && checked <= now && now - checked < 86400000;
}

export function validateApproval(manifest, approval, operation, now = Date.now()) {
  requireValue(approval?.schema === 'famtastic.provision-approval.v1', 'approval_required');
  requireValue(approval.manifest_sha256 === digest(manifest), 'approval_manifest_mismatch');
  requireValue(typeof approval.approved_by === 'string' && approval.approved_by.trim().length > 0
    && typeof approval.evidence_ref === 'string' && approval.evidence_ref.trim().length > 0, 'approval_evidence_required');
  const expires = Date.parse(approval.expires_at), issued = Date.parse(approval.approved_at);
  requireValue(Number.isFinite(expires) && Number.isFinite(issued) && issued <= now && expires > now
    && expires - issued <= 86400000, 'approval_expired_or_invalid');
  requireValue(Array.isArray(approval.operations) && approval.operations.includes(operation), 'operation_not_approved');
  requireValue(hasDomainControl(manifest, now), 'domain_control_unverified');
}

export class CpanelClient {
  constructor({ hostname, account, token, port = 2083, fetchImpl = fetch }) {
    requireValue(fqdn(hostname) && Number(port) === 2083, 'cpanel_endpoint_invalid');
    requireValue(/^[a-z][a-z0-9]{0,15}$/.test(account || ''), 'cpanel_account_invalid');
    requireValue(typeof token === 'string' && /^[A-Za-z0-9_-]{12,}$/.test(token), 'cpanel_token_invalid');
    this.origin = `https://${hostname}:2083`; this.account = account;
    this.token = token; this.fetch = fetchImpl;
  }
  async request(path, params, legacy = false) {
    // Never put provider credentials, mailbox passwords or private keys in URLs/logs.
    // Redirects are not followed, including redirects to another authenticated host.
    let response, body;
    try {
      response = await this.fetch(this.origin + path, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25000),
        headers: { Authorization: `cpanel ${this.account}:${this.token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      });
      if (!response.ok) throw new Error('http');
      body = await response.json();
    } catch {
      // The provider may have accepted a write before the connection broke.
      // Never auto-retry here. A later run reconciles provider state first.
      throw new Error('cpanel_response_unconfirmed_reconcile_before_retry');
    }
    const result = legacy ? body.cpanelresult : (body.result ?? body);
    const success = legacy ? Number(result?.event?.result) === 1
      && !(result.data || []).some(row => row.result !== undefined && Number(row.result) !== 1)
      : Number(result?.status) === 1;
    requireValue(success && !result.error && !(result.errors?.length), 'cpanel_operation_failed');
    return result.data;
  }
  uapi(module, operation, params = {}) {
    const allowed = new Set(['DomainInfo/domains_data', 'Email/list_pops', 'Email/add_pop', 'SSL/installed_hosts', 'SSL/install_ssl']);
    requireValue(allowed.has(`${module}/${operation}`), 'cpanel_operation_not_allowed');
    return this.request(`/execute/${module}/${operation}`, params);
  }
  addDomain(m) {
    return this.request('/json-api/cpanel', {
      cpanel_jsonapi_user: this.account, cpanel_jsonapi_apiversion: '2',
      cpanel_jsonapi_module: 'AddonDomain', cpanel_jsonapi_func: 'addaddondomain',
      newdomain: m.domain, subdomain: m.hosting.subdomain_label, dir: m.hosting.document_root,
    }, true);
  }
}

export function domainRows(data) {
  requireValue(data && typeof data === 'object' && !Array.isArray(data), 'domain_inventory_invalid');
  requireValue(Array.isArray(data.addon_domains) && Array.isArray(data.sub_domains)
    && Array.isArray(data.parked_domains), 'domain_inventory_incomplete');
  const rows = [...data.addon_domains, ...data.sub_domains, ...data.parked_domains];
  requireValue(rows.every(row => row && typeof row === 'object' && fqdn(row.domain)), 'domain_inventory_invalid');
  return rows;
}

export async function inspect(client, manifest) {
  const m = validateManifest(manifest);
  requireValue(client.account === m.hosting.account, 'hosting_account_mismatch');
  const [data, mail] = await Promise.all([
    client.uapi('DomainInfo', 'domains_data'), client.uapi('Email', 'list_pops'),
  ]);
  requireValue(data?.main_domain?.domain === m.hosting.main_domain, 'hosting_main_domain_mismatch');
  const rows = domainRows(data);
  requireValue(Array.isArray(mail), 'mail_inventory_invalid');
  const root = `/home/${m.hosting.account}/${m.hosting.document_root}`;
  const target = rows.find(row => row.domain === m.domain || String(row.serveralias || '').split(/\s+/).includes(m.domain));
  const blockers = [];
  if (!hasDomainControl(m)) blockers.push('domain_control_unverified');
  if (target && target.documentroot !== root) blockers.push('existing_domain_root_mismatch');
  for (const row of rows.filter(row => row.domain !== m.domain)) {
    const other = row.documentroot;
    if (typeof other === 'string' && (other === root || root.startsWith(other + '/') || other.startsWith(root + '/')))
      blockers.push('document_root_overlaps_another_site');
    if (!target && (row.domain === `${m.hosting.subdomain_label}.${m.hosting.main_domain}`
      || row.servername === `${m.hosting.subdomain_label}.${m.hosting.main_domain}`)) blockers.push('subdomain_already_in_use');
  }
  const mailboxSteps = m.mailboxes.map(box => {
    const existing = mail.find(row => (row.email || `${row.login}@${row.domain}`) === `${box.local_part}@${m.domain}`);
    return { local_part: box.local_part, state: existing ? 'present' : 'create' };
  });
  return { schema: 'famtastic.hosting-preflight.v1', checked_at: new Date().toISOString(), site_id: m.site_id,
    manifest_sha256: digest(m), domain: m.domain, document_root: root,
    domain_state: target ? 'present' : 'create', mailboxes: mailboxSteps,
    blockers: [...new Set(blockers)], provider_writes: 0,
    customer_ownership_verified: m.domain_ownership?.status === 'verified' && Boolean(m.domain_ownership.evidence_ref),
    customer_launch_complete: false,
    unproven: ['registrar_ownership', 'public_dns', 'website_deployment', 'email_delivery', 'tls_and_renewal', 'analytics_collection'] };
}

export function validateCertificate(m, { certificate, key, cabundle }, now = Date.now()) {
  try {
    const cert = new X509Certificate(certificate);
    const privateKey = createPrivateKey(key);
    requireValue(cert.checkHost(m.domain, { wildcards: false }) === m.domain, 'tls_domain_mismatch');
    requireValue(cert.checkPrivateKey(privateKey), 'tls_key_mismatch');
    requireValue(Date.parse(cert.validFrom) <= now && Date.parse(cert.validTo) > now + 7 * 86400000, 'tls_dates_invalid');
    requireValue(!cert.verify(cert.publicKey), 'tls_self_signed_not_allowed');
    requireValue(typeof cabundle === 'string' && cabundle.includes('-----BEGIN CERTIFICATE-----'), 'tls_chain_required');
    return { fingerprint_sha256: cert.fingerprint256, expires_at: new Date(cert.validTo).toISOString() };
  } catch (error) {
    if (/^tls_/.test(error.message)) throw error;
    throw new Error('tls_material_invalid');
  }
}

export async function applyStep(client, manifest, approval, operation, { secrets = {}, tls = null } = {}) {
  validateApproval(manifest, approval, operation);
  requireValue(['domain', 'mailboxes', 'tls'].includes(operation), 'operation_unknown');
  const before = await inspect(client, manifest);
  requireValue(before.blockers.length === 0, 'preflight_blocked');
  const events = [];
  if (operation === 'domain') {
    if (before.domain_state === 'create') { await client.addDomain(manifest); events.push('domain_created'); }
    else events.push('domain_already_present');
    const after = await inspect(client, manifest);
    requireValue(after.domain_state === 'present' && after.blockers.length === 0, 'domain_postcondition_failed');
  } else {
    requireValue(before.domain_state === 'present', 'domain_must_exist_first');
    if (operation === 'mailboxes') {
      const pending = manifest.mailboxes.filter(box => before.mailboxes.some(step => step.local_part === box.local_part && step.state === 'create'));
      // Validate all secrets before creating the first mailbox. Existing mailboxes
      // are never reset or deleted and never require their old password.
      for (const box of pending) requireValue(typeof secrets[box.password_env] === 'string'
        && secrets[box.password_env].length >= 20 && !/[\r\n\0]/.test(secrets[box.password_env]), 'mailbox_secret_missing_or_weak');
      for (const box of pending) {
        await client.uapi('Email', 'add_pop', { email: box.local_part, domain: manifest.domain,
          password: secrets[box.password_env], quota: String(box.quota_mb) });
        events.push(`mailbox_created:${box.local_part}`);
      }
      const after = await inspect(client, manifest);
      requireValue(after.mailboxes.every(box => box.state === 'present'), 'mailbox_postcondition_failed');
      if (!pending.length) events.push('mailboxes_already_present');
    } else {
      requireValue(tls, 'tls_material_required');
      const facts = validateCertificate(manifest, tls);
      await client.uapi('SSL', 'install_ssl', { domain: manifest.domain, cert: tls.certificate, key: tls.key, cabundle: tls.cabundle });
      // Installation acknowledgement is not public HTTPS/chain/renewal proof.
      events.push({ event: 'tls_install_acknowledged', ...facts, public_https_verified: false, renewal_verified: false });
    }
  }
  return { schema: 'famtastic.hosting-step.v1', checked_at: new Date().toISOString(), site_id: manifest.site_id,
    manifest_sha256: digest(manifest), operation, events, customer_launch_complete: false };
}
