-- Migration 003: editable page content
--
-- Powers the /admin/content editor. Each row is a single editable string
-- for a page/section/key. Pages render with fallback defaults if a key
-- is missing, so the site never breaks when content is sparse.

CREATE TABLE IF NOT EXISTS `page_content` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `page`        VARCHAR(64) NOT NULL,
  `section`     VARCHAR(64) NOT NULL,
  `key_name`    VARCHAR(64) NOT NULL,
  `value_text`  LONGTEXT DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_page_content_page_section_key` (`page`, `section`, `key_name`),
  KEY `idx_page_content_page` (`page`),
  KEY `idx_page_content_section` (`page`, `section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default homepage content so the site renders immediately
-- after migration. These match the current hardcoded homepage.
INSERT INTO `page_content` (`page`, `section`, `key_name`, `value_text`) VALUES
  ('index', 'hero', 'prompt', '// famtastichosting.com'),
  ('index', 'hero', 'headline_line1', 'Your domain.'),
  ('index', 'hero', 'headline_line2', 'Your brand.'),
  ('index', 'hero', 'headline_line3', 'Handled.'),
  ('index', 'hero', 'subheadline', 'Premium hosting from $7/mo. Custom nameservers. Your brand on everything.'),
  ('index', 'hero', 'primary_cta', 'Explore Plans'),
  ('index', 'hero', 'primary_cta_url', '#products'),
  ('index', 'hero', 'secondary_cta', 'Contact Us'),
  ('index', 'hero', 'secondary_cta_url', '/contact'),

  ('index', 'trust_bar', 'item_1', '99.9% Uptime'),
  ('index', 'trust_bar', 'item_2', '1,000+ Sites Hosted'),
  ('index', 'trust_bar', 'item_3', 'Based in Miami, FL'),

  ('index', 'story_1', 'title', 'Hosting that stays out of your way'),
  ('index', 'story_1', 'body', 'You have a business to run. The last thing you need is a control panel that fights back or support that takes days. We built FAMtastic Hosting for people who want their site online, fast, with a brand that looks like theirs — not a reseller sticker.'),
  ('index', 'story_1', 'cta', 'See the difference'),
  ('index', 'story_1', 'cta_url', '/hosting'),

  ('index', 'story_2', 'title', 'Your brand on every touchpoint'),
  ('index', 'story_2', 'body', 'Custom nameservers. White-label support. SSL included. From the first click to the first invoice, your customers see you — not the wholesale provider behind the curtain.'),

  ('index', 'cross_promo_designs', 'title', 'Need a site to go with your hosting?'),
  ('index', 'cross_promo_designs', 'body', 'A lot of our clients came to us for hosting and left with a site they are proud of. FAMtastic Designs builds custom sites, logos, and brand packages for businesses that want to stand out.'),
  ('index', 'cross_promo_designs', 'cta', 'Talk to a designer'),
  ('index', 'cross_promo_designs', 'cta_url', 'https://famtasticdesigns.com'),

  ('index', 'cross_promo_thoughts', 'title', 'Running a site? Learn how to grow it.'),
  ('index', 'cross_promo_thoughts', 'body', 'FAMtastic Thoughts publishes real guides on hosting, design, domains, and running a business online. No fluff. No sales pitch. Just useful answers.'),
  ('index', 'cross_promo_thoughts', 'cta', 'Read the latest'),
  ('index', 'cross_promo_thoughts', 'cta_url', 'https://famtasticthoughts.com')

ON DUPLICATE KEY UPDATE
  `value_text` = VALUES(`value_text`);
