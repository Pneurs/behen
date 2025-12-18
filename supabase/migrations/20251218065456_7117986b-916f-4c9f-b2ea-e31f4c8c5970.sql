-- Insert chat_system_enabled setting
INSERT INTO app_settings (key, value)
VALUES ('chat_system_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;