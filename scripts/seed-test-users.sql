-- Test users for QA. Password for both is: TestPass123!
-- Generated with bcrypt cost 10.

DELETE FROM users WHERE email IN ('testadmin@famtastichosting.com', 'testcustomer@famtastichosting.com');

INSERT INTO users (email, password_hash, role, created_at) VALUES
  ('testadmin@famtastichosting.com',  '$2a$10$33oERDMRKS0hYL748DspP.uzHkRF.ESowZhwvY9dIvgz0Gi.aalZO', 'admin',    NOW()),
  ('testcustomer@famtastichosting.com','$2a$10$33oERDMRKS0hYL748DspP.uzHkRF.ESowZhwvY9dIvgz0Gi.aalZO', 'customer', NOW());
