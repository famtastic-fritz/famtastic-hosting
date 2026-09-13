import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSiteLaunchPlan, executeSiteLaunch, FulfillmentContractError } from '../src/lib/fulfillment/site-launch.mjs';

const paid = { status: 'paid', provider: 'stripe', evidence_id: 'evt_verified_1', amount_cents: 19900, currency: 'usd' };
const artifact = { verified: true, commit: 'abcdef1234567890' };

test('builds the complete shared-hosting launch sequence without mutating providers', () => {
  const plan = buildSiteLaunchPlan({ site_key: 'tighten-up-your-locs', domain: 'tightenupyourlocs.com', domain_mode: 'existing', payment: paid, artifact, mailbox: 'hello@tightenupyourlocs.com', forwarding_to: 'shay@example.com' });
  assert.equal(plan.executable, true);
  assert.equal(plan.document_root, 'public_html/sites/tighten-up-your-locs');
  assert.deepEqual(plan.steps.map(step => step.key), ['payment', 'artifact', 'document_root', 'dns', 'ssl', 'mailbox', 'forwarding', 'verification']);
});

test('domain purchasing remains blocked without a fresh quote and owner approval', () => {
  const plan = buildSiteLaunchPlan({ site_key: 'shay-site', domain: 'shay.example', domain_mode: 'purchase', payment: paid, artifact });
  assert.equal(plan.executable, false);
  assert.deepEqual(plan.blockers, ['domain_purchase_owner_approval_required', 'fresh_domain_quote_required']);
});

test('rejects root deployment and mailbox cross-domain mistakes', () => {
  assert.throws(() => buildSiteLaunchPlan({ site_key: 'shay-site', domain: 'shay.example', document_root: 'public_html', payment: paid, artifact }), error => error instanceof FulfillmentContractError && error.code === 'document_root_invalid');
  assert.throws(() => buildSiteLaunchPlan({ site_key: 'shay-site', domain: 'shay.example', payment: paid, artifact, mailbox: 'hello@other.example' }), error => error instanceof FulfillmentContractError && error.code === 'mailbox_domain_mismatch');
});

test('blocks forwarding until the source mailbox is defined', () => {
  const plan = buildSiteLaunchPlan({
    site_key: 'shay-site',
    domain: 'shay.example',
    payment: paid,
    artifact,
    mailbox: '',
    forwarding_to: 'owner@gmail.com',
  });

  assert.equal(plan.executable, false);
  assert.deepEqual(plan.blockers, ['mailbox_required_for_forwarding']);
  assert.equal(plan.steps.some(step => step.key === 'forwarding'), false);
});

test('execution requires explicit authorization and verified receipts from every adapter', async () => {
  const plan = buildSiteLaunchPlan({ site_key: 'shay-site', domain: 'shay.example', payment: paid, artifact });
  await assert.rejects(() => executeSiteLaunch(plan, {}, {}), error => error.code === 'execution_not_authorized');
  const calls = [];
  const adapters = Object.fromEntries(plan.steps.filter(step => !['payment', 'artifact'].includes(step.key)).map(step => [step.key, async () => { calls.push(step.key); return { status: 'verified', evidence_id: `proof-${step.key}` }; }]));
  const receipt = await executeSiteLaunch(plan, adapters, { authorization_id: 'owner-approval-1', approved_by_owner: true });
  assert.equal(receipt.status, 'verified');
  assert.deepEqual(calls, ['document_root', 'dns', 'ssl', 'verification']);
});
