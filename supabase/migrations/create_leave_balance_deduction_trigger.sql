-- Create function to deduct leave balance when leave is approved
CREATE OR REPLACE FUNCTION deduct_leave_balance_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  days_to_deduct integer := 1;
  user_balance record;
  year integer := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Only proceed if status changed from pending to approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- Calculate days to deduct
    IF NEW.category = 'multi-day' AND NEW.from_date IS NOT NULL AND NEW.to_date IS NOT NULL THEN
      -- Count non-Sunday days in the range
      days_to_deduct := 0;
      FOR i IN 0..(NEW.to_date::date - NEW.from_date::date) LOOP
        IF (NEW.from_date::date + i)::text::date::integer % 7 != 0 THEN -- Not Sunday
          days_to_deduct := days_to_deduct + 1;
        END IF;
      END LOOP;
    END IF;
    
    -- Find the user's leave balance (check all user types)
    SELECT * INTO user_balance 
    FROM member_leave_balances 
    WHERE (member_id = NEW.user_id OR admin_id = NEW.user_id OR project_manager_id = NEW.user_id)
    AND year = year
    LIMIT 1;
    
    IF user_balance IS NULL THEN
      RAISE EXCEPTION 'No leave balance found for user %', NEW.user_id;
    END IF;
    
    -- Deduct the appropriate leave type
    CASE NEW.leave_type
      WHEN 'sick' THEN
        IF user_balance.sick_leaves < days_to_deduct THEN
          RAISE EXCEPTION 'Insufficient sick leave balance. Available: %, Required: %', user_balance.sick_leaves, days_to_deduct;
        END IF;
        UPDATE member_leave_balances 
        SET sick_leaves = sick_leaves - days_to_deduct
        WHERE id = user_balance.id;
      WHEN 'casual' THEN
        IF user_balance.casual_leaves < days_to_deduct THEN
          RAISE EXCEPTION 'Insufficient casual leave balance. Available: %, Required: %', user_balance.casual_leaves, days_to_deduct;
        END IF;
        UPDATE member_leave_balances 
        SET casual_leaves = casual_leaves - days_to_deduct
        WHERE id = user_balance.id;
      WHEN 'paid' THEN
        IF user_balance.paid_leaves < days_to_deduct THEN
          RAISE EXCEPTION 'Insufficient paid leave balance. Available: %, Required: %', user_balance.paid_leaves, days_to_deduct;
        END IF;
        UPDATE member_leave_balances 
        SET paid_leaves = paid_leaves - days_to_deduct
        WHERE id = user_balance.id;
      ELSE
        RAISE EXCEPTION 'Invalid leave type: %', NEW.leave_type;
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when leave status is updated
DROP TRIGGER IF EXISTS deduct_leave_balance_trigger ON leaves;
CREATE TRIGGER deduct_leave_balance_trigger
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION deduct_leave_balance_on_approval();
