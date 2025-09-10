-- Useful views and functions for poll statistics

-- Create a view for poll results with vote counts
CREATE OR REPLACE VIEW public.poll_results AS
SELECT 
  p.id as poll_id,
  p.title,
  p.description,
  p.creator_id,
  p.is_active,
  p.allow_multiple_choices,
  p.created_at as poll_created_at,
  po.id as option_id,
  po.text as option_text,
  po.order_index,
  COALESCE(vote_counts.vote_count, 0) as vote_count,
  COALESCE(total_votes.total, 0) as total_poll_votes
FROM public.polls p
LEFT JOIN public.poll_options po ON p.id = po.poll_id
LEFT JOIN (
  SELECT 
    option_id, 
    COUNT(*) as vote_count
  FROM public.votes 
  GROUP BY option_id
) vote_counts ON po.id = vote_counts.option_id
LEFT JOIN (
  SELECT 
    poll_id, 
    COUNT(*) as total
  FROM public.votes 
  GROUP BY poll_id
) total_votes ON p.id = total_votes.poll_id
ORDER BY p.created_at DESC, po.order_index ASC;

-- Function to get poll with options and vote counts
CREATE OR REPLACE FUNCTION get_poll_with_results(poll_uuid UUID)
RETURNS TABLE(
  poll_id UUID,
  title TEXT,
  description TEXT,
  creator_id UUID,
  creator_email TEXT,
  creator_username TEXT,
  is_active BOOLEAN,
  allow_multiple_choices BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  option_id UUID,
  option_text TEXT,
  order_index INTEGER,
  vote_count BIGINT,
  total_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.creator_id,
    pr.email,
    pr.username,
    p.is_active,
    p.allow_multiple_choices,
    p.expires_at,
    p.created_at,
    p.updated_at,
    po.id,
    po.text,
    po.order_index,
    COALESCE(v.vote_count, 0::bigint),
    COALESCE(tv.total, 0::bigint)
  FROM public.polls p
  LEFT JOIN public.profiles pr ON p.creator_id = pr.id
  LEFT JOIN public.poll_options po ON p.id = po.poll_id
  LEFT JOIN (
    SELECT option_id, COUNT(*) as vote_count
    FROM public.votes 
    GROUP BY option_id
  ) v ON po.id = v.option_id
  LEFT JOIN (
    SELECT poll_id, COUNT(*) as total
    FROM public.votes 
    GROUP BY poll_id
  ) tv ON p.id = tv.poll_id
  WHERE p.id = poll_uuid
  ORDER BY po.order_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has already voted on a poll
CREATE OR REPLACE FUNCTION user_has_voted(poll_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM public.votes 
    WHERE poll_id = poll_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's votes for a specific poll
CREATE OR REPLACE FUNCTION get_user_votes(poll_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(option_id UUID, option_text TEXT) AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT po.id, po.text
  FROM public.votes v
  JOIN public.poll_options po ON v.option_id = po.id
  WHERE v.poll_id = poll_uuid AND v.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
