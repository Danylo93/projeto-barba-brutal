-- `usuario.barbeiro` não tinha valor padrão, então qualquer cadastro que
-- omitisse o campo estourava 500 ("Argument `barbeiro` is missing"). O
-- frontend sempre mandava false, mas a API é pública: quem chamasse direto
-- (bot do WhatsApp, integração) tomava erro sem explicação.
--
-- O padrão é cliente. Barbeiro se cria pelo cadastro de profissional, que
-- exige token do dono.

ALTER TABLE "usuario" ALTER COLUMN "barbeiro" SET DEFAULT false;
