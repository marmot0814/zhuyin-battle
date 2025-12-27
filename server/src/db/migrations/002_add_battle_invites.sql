CREATE TABLE IF NOT EXISTS battle_invites (
  id SERIAL PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, expired
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_battle_invites_receiver_id ON battle_invites(receiver_id);
CREATE INDEX IF NOT EXISTS idx_battle_invites_status ON battle_invites(status);
