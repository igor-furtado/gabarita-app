ALTER TABLE study_plans
  DROP CONSTRAINT study_plans_hours_check;

ALTER TABLE study_plans
  RENAME COLUMN weekly_hours TO daily_hours;

UPDATE study_plans
SET daily_hours = 2,
    configured = false;

ALTER TABLE study_plans
  ADD CONSTRAINT study_plans_hours_check CHECK(daily_hours BETWEEN 1 AND 24);
