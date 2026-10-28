ALTER TABLE subjects
  ADD COLUMN domain integer,
  ADD CONSTRAINT subjects_domain_check CHECK(domain IS NULL OR domain BETWEEN 0 AND 5);

ALTER TABLE topics
  ADD COLUMN kind text NOT NULL DEFAULT 'regular',
  ADD CONSTRAINT topics_kind_check CHECK(kind IN ('regular','eve_review'));

WITH candidates AS (
  SELECT id,
         row_number() OVER (PARTITION BY subject_id ORDER BY position, id) AS occurrence
  FROM topics
  WHERE lower(trim(name)) = lower('Revisão de Véspera')
)
UPDATE topics
SET name = 'Revisão de Véspera', kind = 'eve_review'
FROM candidates
WHERE topics.id = candidates.id AND candidates.occurrence = 1;

INSERT INTO topics(subject_id, name, kind)
SELECT subjects.id, 'Revisão de Véspera', 'eve_review'
FROM subjects
WHERE NOT EXISTS (
  SELECT 1 FROM topics
  WHERE topics.subject_id = subjects.id AND topics.kind = 'eve_review'
);

CREATE UNIQUE INDEX topics_eve_review_subject_idx
  ON topics(subject_id)
  WHERE kind = 'eve_review';
