import { BadRequestException } from '@nestjs/common';
import { TenantService } from './tenant.service';

/**
 * A instance da Evolution é campo do admin do SaaS.
 *
 * Quem cria a instance no servidor da Evolution é o admin — o dono da
 * barbearia não teria como inventar um nome que existisse. Deixar o campo na
 * mão dele abria duas portas, e as duas terminam em atendimento morto sem
 * mensagem de erro: digitar um nome que não existe, ou digitar o nome da
 * instance de OUTRA barbearia e passar a receber as conversas dela.
 *
 * O terceiro caso é o mais traiçoeiro e não tem nada de má-fé: o
 * `PUT /tenants/me/configuracoes` grava o JSON de configurações INTEIRO. Se o
 * dono salvar o horário de funcionamento numa tela que não conhece o campo, a
 * instance sai do banco junto — e o WhatsApp da barbearia para de responder
 * sem ninguém ter mexido nele.
 */

const INSTANCE = 'barbearia-latita';

function montarServico(
  opcoes: { guardada?: string; deOutra?: boolean; outraSuspensa?: boolean } = {},
) {
  const gravado: any[] = [];

  const prisma = {
    tenant: {
      findUnique: async () => ({
        configuracoes: {
          horario: '09:00-18:00',
          ...(opcoes.guardada ? { evolutionInstance: opcoes.guardada } : {}),
        },
      }),
      // Só é chamado para conferir se a instance já é de outra barbearia.
      findFirst: async (args: any) => {
        if (!opcoes.deOutra && !opcoes.outraSuspensa) return null;
        // O teste falha se a busca voltar a filtrar por barbearia ativa:
        // instance de barbearia suspensa continua reservada.
        expect(args.where).not.toHaveProperty('ativo');
        return {
          id: 99,
          nome: 'Barbearia Vizinha',
          ativo: !opcoes.outraSuspensa,
        };
      },
      update: async ({ data }: any) => {
        gravado.push(data);
        return { id: 1, nome: 'Lá Tita', configuracoes: data.configuracoes };
      },
    },
  };

  const servico = new TenantService(prisma as any);
  return { servico, gravado };
}

describe('instance da Evolution', () => {
  describe('dono da barbearia', () => {
    it('não consegue trocar a instance por outra', async () => {
      const { servico, gravado } = montarServico({ guardada: INSTANCE });

      await servico.update(1, {
        configuracoes: { horario: '10:00-20:00', evolutionInstance: 'a-da-concorrente' },
      });

      expect(gravado[0].configuracoes.evolutionInstance).toBe(INSTANCE);
    });

    // O caso sem má-fé, e o mais provável de acontecer.
    it('não apaga a instance ao salvar outra configuração', async () => {
      const { servico, gravado } = montarServico({ guardada: INSTANCE });

      await servico.update(1, { configuracoes: { horario: '10:00-20:00' } });

      expect(gravado[0].configuracoes.evolutionInstance).toBe(INSTANCE);
      expect(gravado[0].configuracoes.horario).toBe('10:00-20:00');
    });

    it('não consegue cadastrar uma instance onde não havia nenhuma', async () => {
      const { servico, gravado } = montarServico();

      await servico.update(1, { configuracoes: { evolutionInstance: 'inventada' } });

      expect(gravado[0].configuracoes.evolutionInstance).toBeUndefined();
    });

    // `configuracoes: null` gravaria null por cima de tudo e levaria a
    // instance junto — o WhatsApp da barbearia cairia sem ninguém pedir.
    it('não deixa um configuracoes vazio zerar o que estava guardado', async () => {
      const { servico, gravado } = montarServico({ guardada: INSTANCE });

      await servico.update(1, { nome: 'Lá Tita', configuracoes: null });

      expect(gravado[0]).not.toHaveProperty('configuracoes');
      expect(gravado[0].nome).toBe('Lá Tita');
    });
  });

  describe('admin do SaaS', () => {
    it('define a instance', async () => {
      const { servico, gravado } = montarServico();

      await servico.definirInstanceDaEvolution(1, `  ${INSTANCE}  `);

      expect(gravado[0].configuracoes.evolutionInstance).toBe(INSTANCE);
      // O resto das configurações continua de pé.
      expect(gravado[0].configuracoes.horario).toBe('09:00-18:00');
    });

    it('tira a instance quando o campo vem vazio', async () => {
      const { servico, gravado } = montarServico({ guardada: INSTANCE });

      await servico.definirInstanceDaEvolution(1, '');

      expect(gravado[0].configuracoes).not.toHaveProperty('evolutionInstance');
    });

    // A instance é o que diz de quem é a conversa que chega do WhatsApp. Duas
    // barbearias com o mesmo nome é uma lendo e cancelando os agendamentos da
    // outra.
    it('recusa instance que já é de outra barbearia', async () => {
      const { servico } = montarServico({ deOutra: true });

      await expect(servico.definirInstanceDaEvolution(1, INSTANCE)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Barbearia suspensa volta um dia. Se o nome dela tivesse sido dado a
    // outra, as duas dividiriam a mesma caixa de entrada do WhatsApp.
    it('recusa instance de barbearia suspensa, e diz de quem é', async () => {
      const { servico } = montarServico({ outraSuspensa: true });

      await expect(servico.definirInstanceDaEvolution(1, INSTANCE)).rejects.toThrow(
        /Barbearia Vizinha.*suspensa/s,
      );
    });

    it('recusa nome fora do formato aceito pela Evolution', async () => {
      const { servico } = montarServico();

      await expect(servico.definirInstanceDaEvolution(1, 'a b')).rejects.toThrow(
        BadRequestException,
      );
      await expect(servico.definirInstanceDaEvolution(1, 'ab')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
