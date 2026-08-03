import {
  emailAgendamentoConfirmado,
  emailBoasVindas,
  emailPlanoContratado,
  emailRecuperacaoSenha,
} from './templates';

describe('templates de e-mail', () => {
  describe('recuperação de senha', () => {
    const link = 'https://barbeariabrutal.com/redefinir-senha?token=abc123';

    it('coloca o link no HTML e no texto puro', () => {
      const email = emailRecuperacaoSenha({ nome: 'Marcão', link, validadeMinutos: 60 });
      expect(email.html).toContain(link);
      expect(email.texto).toContain(link);
    });

    it('avisa a validade do link', () => {
      const email = emailRecuperacaoSenha({ nome: 'Marcão', link, validadeMinutos: 60 });
      expect(email.html).toContain('60 minutos');
      expect(email.texto).toContain('60 minutos');
    });

    it('diz o que fazer se não foi o titular que pediu', () => {
      const email = emailRecuperacaoSenha({ nome: 'Marcão', link, validadeMinutos: 60 });
      expect(email.html.toLowerCase()).toContain('ignore este e-mail');
      expect(email.texto.toLowerCase()).toContain('ignore este e-mail');
    });

    // Nome vem do cadastro: ninguém impede alguém de se chamar "<script>".
    it('escapa o nome do titular', () => {
      const email = emailRecuperacaoSenha({
        nome: '<script>alert(1)</script>',
        link,
        validadeMinutos: 60,
      });
      expect(email.html).not.toContain('<script>');
      expect(email.html).toContain('&lt;script&gt;');
    });

    it('escapa o link para não quebrar o atributo href', () => {
      const email = emailRecuperacaoSenha({
        nome: 'Marcão',
        link: 'https://x.com/?a="onmouseover="alert(1)',
        validadeMinutos: 60,
      });
      expect(email.html).not.toContain('href="https://x.com/?a="');
      expect(email.html).toContain('&quot;');
    });
  });

  describe('plano contratado', () => {
    const base = {
      nomeBarbearia: 'Barbearia do Marcão',
      nomePlano: 'Profissional',
      preco: 79.9,
      validoAte: new Date('2026-08-28T12:00:00Z'),
      urlPainel: 'https://barbeariabrutal.com/agendamentos',
    };

    it('no teste, deixa claro que não há cobrança', () => {
      const email = emailPlanoContratado({ ...base, emTeste: true });
      expect(email.assunto).toContain('Teste liberado');
      expect(email.html).toContain('Teste grátis até');
      expect(email.texto).toContain('sem cartão');
    });

    it('no pago, confirma o pagamento em vez de prometer teste', () => {
      const email = emailPlanoContratado({ ...base, emTeste: false });
      expect(email.assunto).toContain('Pagamento confirmado');
      expect(email.html).toContain('Válido até');
      expect(email.html).not.toContain('Teste grátis');
    });

    it('formata o preço em real', () => {
      const email = emailPlanoContratado({ ...base, emTeste: false });
      // O Intl usa espaço não-quebrável entre "R$" e o número.
      expect(email.html.replace(/ /g, ' ')).toContain('R$ 79,90');
    });

    it('mostra a data no fuso de Brasília, não em UTC', () => {
      const email = emailPlanoContratado({
        ...base,
        emTeste: true,
        // 00:30 UTC do dia 29 ainda é dia 28 no Brasil.
        validoAte: new Date('2026-08-29T00:30:00Z'),
      });
      expect(email.html).toContain('28/08/2026');
    });

    it('leva o link do painel nas duas versões', () => {
      for (const emTeste of [true, false]) {
        const email = emailPlanoContratado({ ...base, emTeste });
        expect(email.html).toContain(base.urlPainel);
        expect(email.texto).toContain(base.urlPainel);
      }
    });
  });

  describe('boas-vindas', () => {
    it('aponta para a escolha do plano — é o passo que falta', () => {
      const email = emailBoasVindas({
        nomeBarbearia: 'Barbearia do Marcão',
        urlPlanos: 'https://barbeariabrutal.com/planos',
      });
      expect(email.html).toContain('https://barbeariabrutal.com/planos');
      expect(email.texto).toContain('https://barbeariabrutal.com/planos');
    });
  });

  describe('agendamento confirmado', () => {
    const base = {
      nomeCliente: 'João',
      nomeBarbearia: 'Barbearia do Marcão',
      servicos: 'Corte + Barba',
      profissional: 'Marcão',
      // 13h de Brasília.
      quando: new Date('2026-08-05T16:00:00Z'),
    };

    it('mostra data e hora de Brasília no assunto', () => {
      const email = emailAgendamentoConfirmado(base);
      expect(email.assunto).toContain('05/08/2026');
      expect(email.assunto).toContain('13:00');
    });

    it('inclui serviço e profissional', () => {
      const email = emailAgendamentoConfirmado(base);
      expect(email.html).toContain('Corte + Barba');
      expect(email.html).toContain('Marcão');
    });

    it('omite o endereço quando a barbearia não cadastrou', () => {
      const semEndereco = emailAgendamentoConfirmado({ ...base, endereco: null });
      const comEndereco = emailAgendamentoConfirmado({
        ...base,
        endereco: 'Rua das Tesouras, 100',
      });
      expect(comEndereco.html).toContain('Rua das Tesouras, 100');
      expect(comEndereco.texto).toContain('Rua das Tesouras, 100');
      expect(semEndereco.html).not.toContain('Rua das Tesouras');
    });
  });

  it('todo template tem assunto, html e texto preenchidos', () => {
    const emails = [
      emailRecuperacaoSenha({ nome: 'a', link: 'https://x.com', validadeMinutos: 60 }),
      emailBoasVindas({ nomeBarbearia: 'a', urlPlanos: 'https://x.com' }),
      emailPlanoContratado({
        nomeBarbearia: 'a',
        nomePlano: 'b',
        preco: 1,
        validoAte: new Date(),
        emTeste: true,
        urlPainel: 'https://x.com',
      }),
      emailAgendamentoConfirmado({
        nomeCliente: 'a',
        nomeBarbearia: 'b',
        servicos: 'c',
        profissional: 'd',
        quando: new Date(),
      }),
    ];
    for (const email of emails) {
      expect(email.assunto.length).toBeGreaterThan(0);
      expect(email.texto.length).toBeGreaterThan(0);
      expect(email.html).toContain('<!doctype html>');
    }
  });
});
