CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_service text NOT NULL,
  channel_name text,
  buffer_post_id text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviewers can view social posts" ON public.social_posts FOR SELECT TO authenticated USING (public.is_payment_reviewer(auth.uid()));
CREATE INDEX social_posts_product_idx ON public.social_posts(product_id);