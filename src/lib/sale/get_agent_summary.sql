create or replace function get_agent_summary(p_agent_id uuid)
returns table (
  retailer_count bigint,
  total_commission numeric,
  paid_commission numeric
) as $$
begin
  return query
  with agent_retailers as (
    select id from retailers where agent_profile_id = p_agent_id
  ),
  agent_sales as (
    select
      s.agent_commission
    from sales s
    join terminals t on s.terminal_id = t.id
    where t.retailer_id in (select id from agent_retailers)
  ),
  agent_payouts as (
    select
      t.amount
    from transactions t
    where t.agent_profile_id = p_agent_id and t.type = 'commission_payout'
  )
  select
    (select count(*) from agent_retailers) as retailer_count,
    coalesce((select sum(agent_commission) from agent_sales), 0) as total_commission,
    coalesce((select sum(amount) from agent_payouts), 0) as paid_commission;
end;
$$ language plpgsql; 