-- Consultas relacionais para executar no editor SQL do DBeaver.
-- Troque workspace_id = 1 para consultar outro espaço em uma instalação futura.

-- 1. Revisões pendentes até hoje, com matéria e tópico (sem extrair JSON).
SELECT r.id, s.name AS materia, t.name AS topico, r.due_on, r.interval_days
FROM reviews r
JOIN topics t ON t.id = r.topic_id
JOIN subjects s ON s.id = t.subject_id
JOIN study_plans p ON p.id = s.plan_id
WHERE p.workspace_id = 1 AND NOT r.done
  AND r.due_on <= (now() AT TIME ZONE 'America/Fortaleza')::date
ORDER BY r.due_on, s.weight DESC;

-- 2. Horas e aproveitamento por matéria, incluindo matérias sem sessões.
SELECT s.id, s.name, count(ss.id) AS sessoes,
       round((coalesce(sum(ss.minutes), 0) / 60)::numeric, 2) AS horas,
       coalesce(sum(ss.questions), 0) AS questoes,
       coalesce(sum(ss.correct), 0) AS acertos,
       round(100.0 * sum(ss.correct) / nullif(sum(ss.questions), 0), 1) AS aproveitamento
FROM subjects s
JOIN study_plans p ON p.id = s.plan_id
LEFT JOIN topics t ON t.subject_id = s.id
LEFT JOIN study_sessions ss ON ss.topic_id = t.id
WHERE p.workspace_id = 1
GROUP BY s.id, s.name
ORDER BY horas DESC, s.name;

-- 3. Distribuição das causas de erros ainda não superados.
SELECT er.label AS causa, count(*) AS quantidade
FROM error_entries e
JOIN error_reasons er ON er.id = e.reason_id
JOIN subjects s ON s.id = e.subject_id
JOIN study_plans p ON p.id = s.plan_id
WHERE p.workspace_id = 1 AND NOT e.resolved
GROUP BY er.id, er.label
ORDER BY quantidade DESC, causa;

-- 4. Histórico recente (limite explícito para inspeção).
SELECT ss.studied_on, s.name AS materia, t.name AS topico,
       ss.kind, ss.minutes, ss.questions, ss.correct
FROM study_sessions ss
JOIN topics t ON t.id = ss.topic_id
JOIN subjects s ON s.id = t.subject_id
JOIN study_plans p ON p.id = s.plan_id
WHERE p.workspace_id = 1
ORDER BY ss.studied_on DESC, ss.position DESC
LIMIT 100;

-- 5. Auditoria: esta consulta deve retornar zero linhas.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND data_type IN ('json', 'jsonb', 'ARRAY');

-- Para investigar uma consulta com seus dados reais, anteponha:
-- EXPLAIN (ANALYZE, BUFFERS)
-- Atualize estatísticas após importações grandes: ANALYZE;
