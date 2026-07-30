import { AuthService } from './auth.service';

/**
 * Trava a escalação de privilégio provada no cadastro público.
 *
 * `registerUsuario` espalhava `...data` direto no `prisma.usuario.create`.
 * Bastava mandar `barbeiro: true` no corpo — a API é pública — para virar
 * barbeiro de qualquer barbearia. Barbeiro enxerga a agenda inteira e cria
 * agendamento em nome de outro cliente.
 */
describe('cadastro público de cliente', () => {
  let criados: any[];
  let service: AuthService;

  const prisma = {
    tenant: { findUnique: async () => ({ ativo: true }) },
    usuario: {
      create: async ({ data }: any) => {
        criados.push(data);
        return { id: 1, ...data, tenant: { id: data.tenantId, assinatura: null } };
      },
    },
  };

  beforeEach(() => {
    criados = [];
    service = new AuthService(
      prisma as any,
      { sign: () => 'token-falso' } as any,
      {} as any,
      { enviarTemplateEmSegundoPlano: () => undefined } as any,
    );
  });

  const dadosValidos = {
    nome: 'João',
    email: 'joao@x.app',
    telefone: '11955551111',
    senha: 'senha123',
    tenantId: 7,
  };

  it('cria como cliente', async () => {
    await service.registerUsuario(dadosValidos);
    expect(criados[0].barbeiro).toBe(false);
  });

  it('IGNORA barbeiro:true vindo do corpo', async () => {
    await service.registerUsuario({ ...dadosValidos, barbeiro: true } as any);
    expect(criados[0].barbeiro).toBe(false);
  });

  // Sem isto, dava para se cadastrar já com vínculo de profissional, ou
  // mexer no `ativo` de saída.
  it('ignora qualquer campo extra que o corpo mandar', async () => {
    await service.registerUsuario({
      ...dadosValidos,
      barbeiro: true,
      ativo: false,
      id: 999,
      profissionalId: 3,
    } as any);

    expect(Object.keys(criados[0]).sort()).toEqual(
      ['barbeiro', 'email', 'nome', 'senha', 'telefone', 'tenantId'].sort(),
    );
  });

  it('grava o hash da senha, nunca o texto puro', async () => {
    await service.registerUsuario(dadosValidos);
    expect(criados[0].senha).not.toBe('senha123');
    expect(criados[0].senha.startsWith('$2')).toBe(true);
  });

  it('respeita a barbearia informada', async () => {
    await service.registerUsuario(dadosValidos);
    expect(criados[0].tenantId).toBe(7);
  });
});
