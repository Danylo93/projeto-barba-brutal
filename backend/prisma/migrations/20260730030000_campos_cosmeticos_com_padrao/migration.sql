-- Foto e nota são cosméticos, mas o banco os exigia. Consequência provada:
-- POST /profissionais dava 500 ("Argument `imagemUrl` is missing") quando o
-- dono cadastrava alguém da equipe sem foto — no caminho de onboarding, logo
-- depois de assinar.
--
-- O controller de serviço já mandava '' na mão; o de profissional não. Agora
-- o padrão está no banco, então nem chamada direta na API estoura.

ALTER TABLE "profissional" ALTER COLUMN "imagemUrl" SET DEFAULT '';
ALTER TABLE "profissional" ALTER COLUMN "avaliacao" SET DEFAULT 0;
ALTER TABLE "profissional" ALTER COLUMN "quantidadeAvaliacoes" SET DEFAULT 0;
ALTER TABLE "servico" ALTER COLUMN "imagemURL" SET DEFAULT '';
