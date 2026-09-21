CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'auto-approve-credit-purchases',
  '0 * * * *',
  $$SELECT public.auto_approve_due_credit_purchases();$$
);