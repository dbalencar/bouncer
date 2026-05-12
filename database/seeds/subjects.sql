-- Seed data for subjects table
-- This file should be run after the initial schema migration

INSERT INTO common.subjects (username, name, email) VALUES
('admin', 'Administrator', 'admin@bouncer.demo'),
('dev', 'Developer', 'dev@bouncer.demo'),
('owner', 'Owner', 'owner@bouncer.demo'),
('l6', 'Level 6 Manager', 'l6@bouncer.demo'),
('l5', 'Level 5 Manager', 'l5@bouncer.demo'),
('l4', 'Level 4 Manager', 'l4@bouncer.demo'),
('l3', 'Level 3 Manager', 'l3@bouncer.demo'),
('audit', 'Audit User', 'audit@bouncer.demo'),
('sec', 'Security User', 'sec@bouncer.demo')
ON CONFLICT (username) DO NOTHING;
