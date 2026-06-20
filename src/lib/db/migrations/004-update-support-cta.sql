-- Migration 004: update homepage secondary CTA to "24/7 Support"
--
-- Ensures the editable hero CTA matches the new support branding even on
-- databases that already ran migration 003 with the old "Contact Us" value.

INSERT INTO `page_content` (`page`, `section`, `key_name`, `value_text`) VALUES
  ('index', 'hero', 'secondary_cta', '24/7 Support'),
  ('index', 'hero', 'secondary_cta_url', '/contact')
ON DUPLICATE KEY UPDATE
  `value_text` = VALUES(`value_text`);
