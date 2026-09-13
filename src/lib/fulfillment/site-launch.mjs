const DOMAIN = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const SITE_KEY = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

export class FulfillmentContractError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Builds the canonical, side-effect-free launch plan for one purchased site.
 * The returned contract is portable to Site Studio, FAMtastic Designs, and a
 * provider adapter without embedding credentials or provider-specific paths.
 */
export function buildSiteLaunchPlan(input) {
  const siteKey = String(input?.site_key || '').trim().toLowerCase();
  const domain = String(input?.domain || '').trim().toLowerCase();
  if (!SITE_KEY.test(siteKey)) throw new FulfillmentContractError('site_key_invalid', 'Use a lowercase site key with letters, numbers, and hyphens.');
  if (!DOMAIN.test(domain)) throw new FulfillmentContractError('domain_invalid', 'A complete public domain is required.');
  const documentRoot = normalizeRoot(input?.document_root, siteKey);

  const purchaseDomain = input?.domain_mode === 'purchase';
  const mailbox = normalizeMailbox(input?.mailbox, domain);
  const forwardingTo = normalizeEmail(input?.forwarding_to, false);
  const payment = normalizePayment(input?.payment);
  const artifact = normalizeArtifact(input?.artifact);
  const blockers = [];
  if (!payment.verified) blockers.push('verified_payment_required');
  if (!artifact.verified) blockers.push('verified_artifact_required');
  if (purchaseDomain && input?.domain_purchase_authorized !== true) blockers.push('domain_purchase_owner_approval_required');
  if (purchaseDomain && !input?.domain_quote_id) blockers.push('fresh_domain_quote_required');
  if (forwardingTo && !mailbox) blockers.push('mailbox_required_for_forwarding');
  if (mailbox && !forwardingTo) blockers.push('mailbox_forwarding_destination_required');

  const steps = [
    step('payment', 'Verify captured payment', payment.verified ? 'ready' : 'blocked', false),
    step('artifact', 'Verify the approved Git artifact', artifact.verified ? 'ready' : 'blocked', false),
    ...(purchaseDomain ? [step('domain_purchase', `Purchase ${domain}`, blockers.includes('domain_purchase_owner_approval_required') || blockers.includes('fresh_domain_quote_required') ? 'blocked' : 'ready', true)] : []),
    step('document_root', `Create isolated document root ${documentRoot}`, 'ready', false),
    step('dns', `Point ${domain} to the FAMtastic shared-hosting target`, 'ready', false),
    step('ssl', `Issue and verify HTTPS for ${domain}`, 'ready', false),
    ...(mailbox ? [step('mailbox', `Create ${mailbox}`, 'ready', false)] : []),
    ...(forwardingTo && mailbox ? [step('forwarding', `Forward ${mailbox} to ${forwardingTo}`, 'ready', false)] : []),
    step('verification', 'Verify files, DNS, TLS, mailbox/forwarding, and public routes', 'ready', false),
  ];

  return Object.freeze({
    contract: 'famtastic.site-launch.v1',
    plan_id: stablePlanId({ siteKey, domain, documentRoot, payment, artifact, mailbox, forwardingTo }),
    site_key: siteKey,
    domain,
    domain_mode: purchaseDomain ? 'purchase' : 'existing',
    document_root: documentRoot,
    hosting_profile: input?.hosting_profile || 'famtastic-shared-199',
    payment,
    artifact,
    email: { mailbox, forwarding_to: forwardingTo },
    blockers,
    executable: blockers.length === 0,
    steps,
  });
}

/**
 * Runs a launch plan against explicitly supplied adapters. Mutating execution
 * requires a separate authorization receipt. It never guesses or falls back.
 */
export async function executeSiteLaunch(plan, adapters, authorization) {
  if (!plan?.executable) throw new FulfillmentContractError('plan_blocked', 'Resolve every launch-plan blocker before execution.');
  if (!authorization?.authorization_id || authorization?.approved_by_owner !== true) {
    throw new FulfillmentContractError('execution_not_authorized', 'Owner authorization is required for provider changes.');
  }
  const receipts = [];
  for (const item of plan.steps) {
    if (['payment', 'artifact'].includes(item.key)) {
      receipts.push({ key: item.key, status: 'verified', evidence_id: item.key === 'payment' ? plan.payment.evidence_id : plan.artifact.commit });
      continue;
    }
    const adapter = adapters?.[item.key];
    if (typeof adapter !== 'function') throw new FulfillmentContractError(`adapter_${item.key}_missing`, `The ${item.key} adapter is not configured.`);
    const receipt = await adapter({ plan, step: item, authorization });
    if (!receipt?.evidence_id || receipt?.status !== 'verified') {
      throw new FulfillmentContractError(`adapter_${item.key}_unverified`, `The ${item.key} adapter did not return verified evidence.`);
    }
    receipts.push({ key: item.key, ...receipt });
  }
  return {
    contract: 'famtastic.site-launch.receipt.v1',
    plan_id: plan.plan_id,
    authorization_id: authorization.authorization_id,
    status: 'verified',
    receipts,
  };
}

function step(key, label, status, irreversible) {
  return { key, label, status, irreversible };
}

function normalizeRoot(value, siteKey) {
  const root = String(value || `public_html/sites/${siteKey}`).trim().replace(/^\/+|\/+$/g, '');
  if (!root || root === 'public_html' || !/^public_html\/sites\/[a-z0-9][a-z0-9/_-]*$/.test(root) || root.includes('..')) {
    throw new FulfillmentContractError('document_root_invalid', 'The deploy target must be an isolated public_html/sites subdirectory.');
  }
  return root;
}

function normalizeEmail(value, required = true) {
  const email = String(value || '').trim().toLowerCase();
  if (!email && !required) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FulfillmentContractError('email_invalid', 'A valid email address is required.');
  return email;
}

function normalizeMailbox(value, domain) {
  if (!value) return '';
  const mailbox = normalizeEmail(value);
  if (!mailbox.endsWith(`@${domain}`)) throw new FulfillmentContractError('mailbox_domain_mismatch', 'The mailbox must use the launch domain.');
  return mailbox;
}

function normalizePayment(payment) {
  return {
    verified: payment?.status === 'paid' && Boolean(payment?.evidence_id),
    status: payment?.status || 'unverified',
    provider: payment?.provider || '',
    evidence_id: payment?.evidence_id || '',
    amount_cents: Number.isInteger(payment?.amount_cents) ? payment.amount_cents : null,
    currency: String(payment?.currency || 'usd').toLowerCase(),
  };
}

function normalizeArtifact(artifact) {
  const commit = String(artifact?.commit || '').trim();
  return { verified: artifact?.verified === true && /^[0-9a-f]{7,64}$/i.test(commit), commit };
}

function stablePlanId(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `launch-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
