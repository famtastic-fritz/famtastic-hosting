import test from 'node:test';
import assert from 'node:assert/strict';
import { CpanelClient, validateManifest, digest, validateApproval, inspect, applyStep, validateCertificate } from './cpanel.mjs';

function manifest() {
  return { schema: 'famtastic.hosting-provision.v1', site_id: 'test-site', customer_ref: 'drupal:customer:1',
    request_ref: 'drupal:request:2', domain: 'customer.example', domain_ownership: { status: 'verified', evidence_ref: 'fixture-only' },
    domain_control: { status: 'verified', domain: 'customer.example', operator: 'fixture operator', evidence_ref: 'fixture-only', verified_at: new Date(Date.now()-1000).toISOString() },
    hosting: { account: 'testowner', main_domain: 'hosting.example', subdomain_label: 'test-site', document_root: 'customer-sites/test-site/public' },
    mailboxes: [{ local_part: 'hello', quota_mb: 500, password_env: 'FIXTURE_MAIL_PASSWORD' }] };
}
function approval(m, operations = ['domain', 'mailboxes', 'tls']) {
  return { schema: 'famtastic.provision-approval.v1', manifest_sha256: digest(m), approved_by: 'fixture operator',
    evidence_ref: 'fixture-only-not-real-authority', approved_at: new Date(Date.now()-1000).toISOString(),
    expires_at: new Date(Date.now()+60000).toISOString(), operations };
}
function fakeClient(m, { present = false } = {}) {
  const root = `/home/${m.hosting.account}/${m.hosting.document_root}`;
  const data = { main_domain: { domain: m.hosting.main_domain }, addon_domains: present ? [{ domain: m.domain, documentroot: root }] : [], sub_domains: [], parked_domains: [] };
  const mail = [], calls = [];
  return { account: m.hosting.account, data, mail, calls,
    async uapi(module, operation, params) {
      calls.push({ module, operation, params });
      if (module === 'DomainInfo') return structuredClone(data);
      if (operation === 'list_pops') return structuredClone(mail);
      if (operation === 'add_pop') { mail.push({ email: `${params.email}@${params.domain}` }); return {}; }
      throw new Error('unexpected_fixture_operation');
    },
    async addDomain() { calls.push({ operation: 'addDomain' }); data.addon_domains.push({ domain: m.domain, documentroot: root }); },
  };
}
const writes = client => client.calls.filter(call => ['addDomain', 'add_pop', 'install_ssl'].includes(call.operation));

test('manifest validates exact customer/site scoped root, not broad paths', () => {
  assert.equal(validateManifest(manifest()).domain, 'customer.example');
  for (const root of ['public_html', '/', 'customer-sites/other/public', 'customer-sites/test-site/../public', '/home/testowner/customer-sites/test-site/public']) {
    const m = manifest(); m.hosting.document_root = root;
    assert.throws(() => validateManifest(m), /document_root_invalid/);
  }
});
test('unsafe domains, unrelated accounts and duplicate mailboxes are rejected', () => {
  for (const domain of ['https://customer.example', 'x.example/path', '*.example', 'user@customer.example', 'bad..example', '-bad.example']) {
    const m = manifest(); m.domain = domain; assert.throws(() => validateManifest(m), /domain_invalid/);
  }
  const m = manifest(); m.mailboxes.push(m.mailboxes[0]); assert.throws(() => validateManifest(m), /duplicate_mailbox/);
});
test('digest is canonical and approval covers changes, expiry and exact operation', () => {
  const m = manifest(), a = approval(m);
  assert.equal(digest(m), digest(Object.fromEntries(Object.entries(m).reverse())));
  assert.doesNotThrow(() => validateApproval(m, a, 'domain'));
  assert.throws(() => validateApproval(m, { ...a, operations: ['mailboxes'] }, 'domain'), /operation_not_approved/);
  assert.throws(() => validateApproval(m, { ...a, expires_at: new Date(0).toISOString() }, 'domain'), /approval_expired/);
  m.domain = 'different.example'; assert.throws(() => validateApproval(m, a, 'domain'), /approval_manifest_mismatch/);
});
test('plan is read-only and explicitly reports missing domain control', async () => {
  const m = manifest(); m.domain_control.status = 'unverified';
  const client = fakeClient(m), plan = await inspect(client, m);
  assert.deepEqual(plan.blockers, ['domain_control_unverified']);
  assert.equal(plan.domain_state, 'create'); assert.equal(plan.provider_writes, 0); assert.equal(writes(client).length, 0);
  assert.ok(plan.unproven.includes('email_delivery'));
});
test('ownership and approval refusal happen before provider reads or writes', async () => {
  const m = manifest(), client = fakeClient(m);
  await assert.rejects(applyStep(client, m, null, 'domain'), /approval_required/);
  m.domain_control.status = 'unverified';
  await assert.rejects(applyStep(client, m, approval(m), 'domain'), /domain_control_unverified/);
  assert.equal(client.calls.length, 0);
});
test('domain creation reconciles existing resource and is idempotent on rerun', async () => {
  const m = manifest(), client = fakeClient(m), a = approval(m);
  await applyStep(client, m, a, 'domain');
  const rerun = await applyStep(client, m, a, 'domain');
  assert.deepEqual(rerun.events, ['domain_already_present']); assert.equal(writes(client).length, 1);
});
test('controlled operator provision never upgrades unresolved customer ownership', async () => {
  const m = manifest(); m.domain_ownership = { status: 'unverified', evidence_ref: null };
  const client = fakeClient(m);
  await assert.rejects(applyStep(client, m, null, 'domain'), /approval_required/);
  const result = await applyStep(client, m, approval(m), 'domain');
  const plan = await inspect(client, m);
  assert.equal(plan.customer_ownership_verified, false);
  assert.equal(result.customer_launch_complete, false);
  assert.equal(m.domain_ownership.status, 'unverified');
});
test('stale, mismatched or incomplete control evidence fails before provider calls', async () => {
  for (const change of [{ domain: 'other.example' }, { verified_at: new Date(0).toISOString() }, { evidence_ref: '' }, { operator: '' }, { verified_at: new Date(Date.now()+3600000).toISOString() }]) {
    const m = manifest(); Object.assign(m.domain_control, change);
    const client = fakeClient(m);
    await assert.rejects(applyStep(client, m, approval(m), 'domain'), /domain_control_unverified/);
    assert.equal(client.calls.length, 0);
  }
});
test('other-site document roots and subdomain collisions stop writes', async () => {
  for (const collision of ['root', 'subdomain']) {
    const m = manifest(), client = fakeClient(m);
    client.data.sub_domains.push(collision === 'root'
      ? { domain: 'neighbor.example', documentroot: `/home/testowner/${m.hosting.document_root}/assets` }
      : { domain: 'test-site.hosting.example', documentroot: '/home/testowner/other' });
    await assert.rejects(applyStep(client, m, approval(m), 'domain'), /preflight_blocked/);
    assert.equal(writes(client).length, 0);
  }
});
test('existing target with a different root must not be overwritten', async () => {
  const m = manifest(), client = fakeClient(m, { present: true });
  client.data.addon_domains[0].documentroot = '/home/testowner/other';
  await assert.rejects(applyStep(client, m, approval(m), 'domain'), /preflight_blocked/);
});
test('account/main-domain and malformed inventory fail closed', async () => {
  const m = manifest(), client = fakeClient(m);
  client.account = 'other'; await assert.rejects(inspect(client, m), /hosting_account_mismatch/);
  client.account = m.hosting.account; client.data.main_domain.domain = 'different.example';
  await assert.rejects(inspect(client, m), /hosting_main_domain_mismatch/);
  client.data.main_domain.domain = m.hosting.main_domain; delete client.data.parked_domains;
  await assert.rejects(inspect(client, m), /domain_inventory_incomplete/);
});
test('mailboxes require an existing domain and all secrets before any creation', async () => {
  const m = manifest(), client = fakeClient(m);
  await assert.rejects(applyStep(client, m, approval(m), 'mailboxes'), /domain_must_exist_first/);
  await applyStep(client, m, approval(m), 'domain');
  m.mailboxes.push({ local_part: 'support', quota_mb: 500, password_env: 'FIXTURE_SUPPORT_PASSWORD' });
  await assert.rejects(applyStep(client, m, approval(m), 'mailboxes', { secrets: { FIXTURE_MAIL_PASSWORD: 'fixture-secret-not-real-12345' } }), /mailbox_secret_missing/);
  assert.equal(writes(client).filter(call => call.operation === 'add_pop').length, 0);
});
test('mailbox rerun skips existing mailboxes without resetting passwords', async () => {
  const m = manifest(), client = fakeClient(m, { present: true }), a = approval(m);
  const first = await applyStep(client, m, a, 'mailboxes', { secrets: { FIXTURE_MAIL_PASSWORD: 'fixture-secret-not-real-12345' } });
  const second = await applyStep(client, m, a, 'mailboxes');
  assert.equal(writes(client).length, 1); assert.deepEqual(second.events, ['mailboxes_already_present']);
  assert.equal(JSON.stringify(first).includes('fixture-secret-not-real'), false);
  assert.equal(first.customer_launch_complete, false);
});
test('provider postcondition is required even after success acknowledgement', async () => {
  const m = manifest(), client = fakeClient(m);
  client.addDomain = async () => {};
  await assert.rejects(applyStep(client, m, approval(m), 'domain'), /domain_postcondition_failed/);
});
test('transport uses TLS POST, does not follow redirects or expose secrets', async () => {
  let captured;
  const client = new CpanelClient({ hostname: 'cpanel.example', account: 'testowner', token: 'fixture_token_never_real',
    fetchImpl: async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ status: 1, data: [] }) }; } });
  await client.uapi('Email', 'add_pop', { password: 'private-fixture', email: 'hello' });
  assert.equal(captured.url, 'https://cpanel.example:2083/execute/Email/add_pop');
  assert.equal(captured.options.method, 'POST'); assert.equal(captured.options.redirect, 'error');
  assert.equal(captured.options.body.get('password'), 'private-fixture');
  await assert.rejects(async () => client.uapi('SSL', 'delete_ssl'), /cpanel_operation_not_allowed/);
});
test('provider errors and ambiguous transport never leak messages or auto retry', async () => {
  let count = 0;
  const client = new CpanelClient({ hostname: 'cpanel.example', account: 'testowner', token: 'fixture_token_never_real',
    fetchImpl: async () => { count++; throw new Error('secret token exposed by provider'); } });
  await assert.rejects(client.uapi('Email', 'list_pops'), { message: 'cpanel_response_unconfirmed_reconcile_before_retry' });
  assert.equal(count, 1);
  client.fetch = async () => ({ ok: true, json: async () => ({ status: 0, errors: ['secret token'] }) });
  await assert.rejects(client.uapi('Email', 'list_pops'), { message: 'cpanel_operation_failed' });
});
test('legacy domain API rejects per-operation failure despite success envelope', async () => {
  const client = new CpanelClient({ hostname: 'cpanel.example', account: 'testowner', token: 'fixture_token_never_real',
    fetchImpl: async () => ({ ok: true, json: async () => ({ cpanelresult: { event: { result: 1 }, data: [{ result: 0, reason: 'private' }] } }) }) });
  await assert.rejects(client.addDomain(manifest()), /cpanel_operation_failed/);
});
test('bad certificate material cannot reach certificate installation', async () => {
  assert.throws(() => validateCertificate(manifest(), { certificate: 'bad', key: 'bad', cabundle: 'bad' }), { message: 'tls_material_invalid' });
  const m = manifest(), client = fakeClient(m, { present: true });
  await assert.rejects(applyStep(client, m, approval(m), 'tls', { tls: { certificate: 'bad', key: 'bad', cabundle: 'bad' } }), /tls_material_invalid/);
  assert.equal(writes(client).length, 0);
});
