ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
