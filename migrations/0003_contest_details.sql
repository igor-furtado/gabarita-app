ALTER TABLE contests
  ADD COLUMN role_name text NOT NULL DEFAULT '',
  ADD COLUMN vacancies integer,
  ADD COLUMN salary double precision,
  ADD COLUMN education_level text;

ALTER TABLE contests
  ADD CONSTRAINT contests_vacancies_check CHECK(vacancies IS NULL OR vacancies >= 0),
  ADD CONSTRAINT contests_salary_check CHECK(salary IS NULL OR salary >= 0),
  ADD CONSTRAINT contests_education_level_check CHECK(education_level IS NULL OR education_level IN ('medio','tecnico','superior'));
