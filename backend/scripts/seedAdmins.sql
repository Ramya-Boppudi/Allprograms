INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
SELECT 'Admin 1', 'admin1@ksba.karnataka.gov.in', '9999999999', '$2a$10$cc.fh7HW7szyGBEOHSIosui6pcXwuNzR2JOZyGaKdeA3bb4RIrmfi', 'admin', 1
WHERE NOT EXISTS (SELECT 1 FROM staff_users WHERE email = 'admin1@ksba.karnataka.gov.in');

INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
SELECT 'Admin 2', 'admin2@ksba.karnataka.gov.in', '9999999999', '$2a$10$cc.fh7HW7szyGBEOHSIosui6pcXwuNzR2JOZyGaKdeA3bb4RIrmfi', 'admin', 1
WHERE NOT EXISTS (SELECT 1 FROM staff_users WHERE email = 'admin2@ksba.karnataka.gov.in');

INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
SELECT 'Admin 3', 'admin3@ksba.karnataka.gov.in', '9999999999', '$2a$10$cc.fh7HW7szyGBEOHSIosui6pcXwuNzR2JOZyGaKdeA3bb4RIrmfi', 'admin', 1
WHERE NOT EXISTS (SELECT 1 FROM staff_users WHERE email = 'admin3@ksba.karnataka.gov.in');

INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
SELECT 'Admin 4', 'admin4@ksba.karnataka.gov.in', '9999999999', '$2a$10$cc.fh7HW7szyGBEOHSIosui6pcXwuNzR2JOZyGaKdeA3bb4RIrmfi', 'admin', 1
WHERE NOT EXISTS (SELECT 1 FROM staff_users WHERE email = 'admin4@ksba.karnataka.gov.in');

INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
SELECT 'Admin 5', 'admin5@ksba.karnataka.gov.in', '9999999999', '$2a$10$cc.fh7HW7szyGBEOHSIosui6pcXwuNzR2JOZyGaKdeA3bb4RIrmfi', 'admin', 1
WHERE NOT EXISTS (SELECT 1 FROM staff_users WHERE email = 'admin5@ksba.karnataka.gov.in');
