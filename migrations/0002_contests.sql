CREATE TABLE contests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
 name text NOT NULL CONSTRAINT contests_name_check CHECK(length(trim(name))>0),
 exam_date date,
 archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contests_plan_date_idx ON contests(plan_id,exam_date);
CREATE TABLE contest_subjects (
 contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
 subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
 weight double precision NOT NULL CONSTRAINT contest_subjects_weight_check CHECK(weight BETWEEN 1 AND 10),
 all_topics boolean NOT NULL DEFAULT true,
 PRIMARY KEY(contest_id,subject_id)
);
CREATE INDEX contest_subjects_subject_idx ON contest_subjects(subject_id);
CREATE UNIQUE INDEX topics_id_subject_idx ON topics(id,subject_id);
CREATE TABLE contest_topics (
 contest_id uuid NOT NULL,
 subject_id uuid NOT NULL,
 topic_id uuid NOT NULL,
 PRIMARY KEY(contest_id,topic_id),
 FOREIGN KEY(contest_id,subject_id) REFERENCES contest_subjects(contest_id,subject_id) ON DELETE CASCADE,
 FOREIGN KEY(topic_id,subject_id) REFERENCES topics(id,subject_id) ON DELETE CASCADE
);
CREATE INDEX contest_topics_subject_idx ON contest_topics(contest_id,subject_id);
CREATE INDEX contest_topics_topic_idx ON contest_topics(topic_id,subject_id);
INSERT INTO contests(plan_id,name,exam_date)
 SELECT id,target,exam_date FROM study_plans WHERE length(trim(target))>0;
INSERT INTO contest_subjects(contest_id,subject_id,weight)
 SELECT c.id,s.id,s.weight FROM contests c JOIN subjects s ON s.plan_id=c.plan_id;
ALTER TABLE study_plans DROP CONSTRAINT study_plans_target_check;
