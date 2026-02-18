-- Shift vocab_cards positions to make room for inserting a card at a specific position
CREATE OR REPLACE FUNCTION shift_vocab_positions(p_deck_id uuid, p_from_position int)
RETURNS void AS $$
BEGIN
  UPDATE vocab_cards
  SET position = position + 1
  WHERE deck_id = p_deck_id
    AND position >= p_from_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
