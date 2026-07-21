-- Dá a cada barbearia SEM cor de marca (corSecundaria NULL) uma cor de destaque
-- diferente, para que as landings públicas não fiquem todas iguais (amarelo padrão).
-- A paleta não inclui as cores já usadas pelo seed (#ffd700 / #ffffff), então não
-- há conflito com barbearias que já têm cor definida.

WITH pal AS (
  SELECT * FROM (VALUES
    (0,  '#f59e0b'), (1,  '#ef4444'), (2,  '#ec4899'), (3,  '#8b5cf6'),
    (4,  '#3b82f6'), (5,  '#06b6d4'), (6,  '#14b8a6'), (7,  '#22c55e'),
    (8,  '#84cc16'), (9,  '#f97316'), (10, '#a855f7'), (11, '#10b981'),
    (12, '#eab308'), (13, '#6366f1')
  ) AS p(idx, cor)
),
alvo AS (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "id") - 1) AS rn
  FROM "tenant"
  WHERE "corSecundaria" IS NULL
)
UPDATE "tenant" t
SET "corSecundaria" = pal.cor,
    "corPrimaria" = COALESCE(t."corPrimaria", '#1a1a1a')
FROM alvo, pal
WHERE t."id" = alvo."id"
  AND pal.idx = (alvo.rn % 14);
