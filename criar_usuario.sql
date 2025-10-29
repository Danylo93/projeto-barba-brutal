-- Primeiro, criar um Tenant (Owner) se não existir
INSERT INTO "tenant" (nome, email, senha, telefone, ativo, "createdAt", "updatedAt")
VALUES (
  'Barba Brutal',
  'owner@barbabrutal.app',
  '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6',
  '11987654321',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Agora criar o usuário (barbeiro) vinculado ao tenant
INSERT INTO "usuario" (nome, email, senha, telefone, barbeiro, "tenantId", ativo, "createdAt", "updatedAt")
VALUES (
  'João Barbeiro',
  'joao@barbabrutal.app',
  '$2b$10$9LQTRK3LRzIddKYW2C4MTelydFzk5Ys4JoROPajNqvYshhrn1PRa6',
  '11987654321',
  true,
  (SELECT id FROM "tenant" WHERE email = 'owner@barbabrutal.app'),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email, "tenantId") DO NOTHING;

