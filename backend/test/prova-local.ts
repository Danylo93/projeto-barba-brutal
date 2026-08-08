/**
 * Prova de ponta a ponta contra um Postgres de verdade.
 *
 * Os testes de unidade não pegam o que quebrou nesta leva: um decorador que
 * devolve `undefined` e faz a rota inteira responder 403, um saldo de estoque
 * que só fura com requisições realmente paralelas, um `NOT` que some com as
 * linhas cujo campo é nulo. Tudo isso passa no `jest` e falha no ar.
 *
 * Como rodar (o Postgres do sistema serve; não precisa de Docker):
 *
 *     SP=/tmp/pgprova
 *     rm -rf $SP && mkdir -p $SP && chown postgres:postgres $SP
 *     su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $SP/pgdata -U postgres -A trust"
 *     su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $SP/pgdata -o '-p 55432' -l $SP/pg.log start"
 *     psql -h localhost -p 55432 -U postgres -c "CREATE DATABASE barba;"
 *
 *     cd backend
 *     export PGURL="postgresql://postgres@localhost:55432/barba"
 *     DATABASE_URL="$PGURL" DIRECT_URL="$PGURL" npx prisma migrate deploy
 *     DATABASE_URL="$PGURL" DIRECT_URL="$PGURL" JWT_SECRET="prova-local" \\
 *       npx ts-node -r tsconfig-paths/register test/prova-local.ts
 *
 * O banco é zerado a cada execução — nunca aponte para produção.
 */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE = 'http://127.0.0.1:3999';

let ok = 0;
let falhas = 0;
function checa(titulo: string, condicao: boolean, detalhe = '') {
  if (condicao) {
    console.log(`  \x1b[32mok   \x1b[0m ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
    ok++;
  } else {
    console.log(`  \x1b[31mFALHA\x1b[0m ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
    falhas++;
  }
}

async function api(metodo: string, caminho: string, token?: string, corpo?: any) {
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  let dados: any = null;
  try {
    dados = await r.json();
  } catch {
    /* sem corpo */
  }
  return { status: r.status, dados };
}

async function limpar() {
  // Roda quantas vezes precisar. Zerar aqui é o que torna a prova repetível.
  await prisma.$executeRawUnsafe(
    'TRUNCATE agendamento, movimento_estoque, produto, serie_agendamento, ' +
      'usuario, servico, profissional, assinatura, tenant, plano ' +
      'RESTART IDENTITY CASCADE',
  );
}

async function semear() {
  const senha = await bcrypt.hash('#Senha123', 10);

  const plano = await prisma.plano.create({
    data: {
      nome: 'Premium',
      descricao: 'teste',
      preco: 99.9,
      duracao: 30,
      maxUsuarios: 999999,
      maxAgendamentos: 999999,
      // As features de verdade: o FeatureGuard casa por substring, e
      // `['tudo']` não contém 'agendamentos'.
      features: ['Agendamentos ilimitados', 'Profissionais ilimitados'],
      grupo: 'premium',
      periodicidade: 'mensal',
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      nome: 'Barbearia da Prova',
      email: 'dono@prova.app',
      telefone: '11999990000',
      senha,
      dominio: 'prova',
      documento: '11122233396',
      ativo: true,
      chavePix: 'dono@prova.app',
      sinalAtivo: true,
      sinalPercent: 30,
      sinalMinimo: 10,
      sinalPrazoMinutos: 30,
      agendamentoSemConta: true,
    },
  });

  const inicio = new Date();
  const fim = new Date(Date.now() + 30 * 86400000);
  await prisma.assinatura.create({
    data: {
      tenantId: tenant.id,
      planoId: plano.id,
      status: 'active',
      emTeste: false,
      dataInicio: inicio,
      dataFim: fim,
    },
  });

  const barbeiroUsuario = await prisma.usuario.create({
    data: {
      nome: 'Marcão',
      email: 'marcao@prova.app',
      senha,
      telefone: '11988880000',
      barbeiro: true,
      tenantId: tenant.id,
    },
  });

  const profissional = await prisma.profissional.create({
    data: {
      nome: 'Marcão',
      descricao: 'barbeiro',
      tenantId: tenant.id,
      usuarioId: barbeiroUsuario.id,
    },
  });

  const servico = await prisma.servico.create({
    data: {
      nome: 'Corte',
      descricao: 'corte de cabelo',
      preco: 50,
      qtdeSlots: 1,
      tenantId: tenant.id,
      profissionais: { connect: { id: profissional.id } },
    },
  });

  // Cliente antigo, com o telefone gravado COM DDI — como a Evolution grava.
  const cliente = await prisma.usuario.create({
    data: {
      nome: 'João Silva',
      email: 'joao@prova.app',
      senha,
      telefone: '5511964891128',
      tenantId: tenant.id,
    },
  });

  return { tenant, plano, profissional, servico, cliente, barbeiroUsuario };
}

async function main() {
  await limpar();
  const dados = await semear();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  app.set('trust proxy', 1);
  await app.listen(3999, '127.0.0.1');

  // ── tokens ──────────────────────────────────────────────────────────────
  const loginDono = await api('POST', '/auth/login', undefined, {
    email: 'dono@prova.app',
    senha: '#Senha123',
  });
  const DONO = loginDono.dados?.access_token;
  const loginBarbeiro = await api('POST', '/auth/usuario/login', undefined, {
    email: 'marcao@prova.app',
    senha: '#Senha123',
    tenantId: dados.tenant.id,
  });
  const BARBEIRO = loginBarbeiro.dados?.access_token;

  checa('dono entra', !!DONO);
  checa('barbeiro entra', !!BARBEIRO);

  // ── 1. produtos e séries voltaram a abrir ───────────────────────────────
  console.log('\n== 1. produtos e recorrentes acessíveis (davam 403 para todo mundo) ==');
  const rotas: Array<[string, string, string | undefined]> = [
    ['GET', '/produtos', DONO],
    ['GET', '/produtos', BARBEIRO],
    ['GET', '/produtos/resumo', DONO],
    ['GET', '/produtos/movimentos', DONO],
    ['GET', '/series', DONO],
    ['GET', '/series', BARBEIRO],
  ];
  for (const [metodo, caminho, token] of rotas) {
    const r = await api(metodo, caminho, token);
    checa(
      `${metodo} ${caminho} (${token === DONO ? 'dono' : 'barbeiro'})`,
      r.status === 200,
      `HTTP ${r.status}`,
    );
  }

  const criado = await api('POST', '/produtos', DONO, {
    nome: 'Pomada',
    precoVenda: 40,
    precoCusto: 32,
    estoque: 3,
    estoqueMinimo: 1,
  });
  checa('dono cadastra produto', criado.status === 201, `HTTP ${criado.status}`);
  const produtoId = criado.dados?.id;

  const clienteToken = await api('POST', '/auth/usuario/login', undefined, {
    email: 'joao@prova.app',
    senha: '#Senha123',
    tenantId: dados.tenant.id,
  });
  const rCliente = await api('GET', '/produtos', clienteToken.dados?.access_token);
  checa('cliente NÃO acessa o estoque', rCliente.status === 403, `HTTP ${rCliente.status}`);

  // ── 2. estoque não fura em venda simultânea ─────────────────────────────
  console.log('\n== 2. seis vendas simultâneas de um estoque de 3 ==');
  const vendas = await Promise.all(
    Array.from({ length: 6 }, () =>
      api('POST', `/produtos/${produtoId}/movimentos`, BARBEIRO, {
        tipo: 'venda',
        quantidade: 1,
      }),
    ),
  );
  const aceitas = vendas.filter((v) => v.status === 201).length;
  const recusadas = vendas.filter((v) => v.status === 400).length;
  const saldo = await prisma.produto.findUnique({ where: { id: produtoId } });
  const movimentos = await prisma.movimentoEstoque.count({
    where: { produtoId, tipo: 'venda' },
  });

  checa('só três vendas passam', aceitas === 3, `aceitas ${aceitas}, recusadas ${recusadas}`);
  checa('o saldo zera', saldo?.estoque === 0, `estoque ${saldo?.estoque}`);
  checa('e o histórico bate com o saldo', movimentos === 3, `${movimentos} movimentos`);

  // ── 3. agendamento sem conta reaproveita quem tem DDI ───────────────────
  console.log('\n== 3. agendamento sem conta ==');
  const amanha = new Date(Date.now() + 2 * 86400000);
  amanha.setUTCHours(17, 0, 0, 0); // 14h em Brasília
  const publico = await api('POST', '/publico/prova/agendamentos', undefined, {
    nome: 'Qualquer Nome',
    telefone: '11964891128', // o mesmo do João, sem DDI
    profissionalId: dados.profissional.id,
    servicos: [dados.servico.id],
    data: amanha.toISOString(),
    aceitouTermos: true,
  });
  checa('marca sem login', publico.status === 201, `HTTP ${publico.status}`);
  checa(
    'a resposta não entrega se o telefone já era cliente',
    publico.dados && !('novaConta' in publico.dados),
    Object.keys(publico.dados ?? {}).join(','),
  );
  checa(
    'não vaza dado do cliente',
    !JSON.stringify(publico.dados ?? {}).includes('joao@prova.app'),
  );

  const contas = await prisma.usuario.count({ where: { tenantId: dados.tenant.id } });
  const agendamentoDoJoao = await prisma.agendamento.findFirst({
    where: { usuarioId: dados.cliente.id },
  });
  checa('reaproveita a conta com DDI, sem criar duplicata', contas === 2, `${contas} usuários`);
  checa('e o agendamento é do João', !!agendamentoDoJoao);

  checa(
    'o nome do cliente NÃO foi sobrescrito',
    (await prisma.usuario.findUnique({ where: { id: dados.cliente.id } }))?.nome === 'João Silva',
  );

  // sinal cobrado
  checa(
    'sinal de 30% cobrado (R$ 15 no corte de R$ 50)',
    agendamentoDoJoao?.sinalValor === 15,
    `R$ ${agendamentoDoJoao?.sinalValor}`,
  );

  // ── 4. sinal pago depois do prazo devolve o horário ─────────────────────
  console.log('\n== 4. sinal pago com atraso ==');
  await prisma.agendamento.update({
    where: { id: agendamentoDoJoao!.id },
    data: { sinalExpiraEm: new Date(Date.now() - 60_000) },
  });
  const expirou = await api('POST', '/lembretes/sinais/expirar', undefined, undefined);
  // sem token: 401/503 esperado; roda direto pelo serviço
  const depoisDaVarredura = await prisma.agendamento.update({
    where: { id: agendamentoDoJoao!.id },
    data: { status: 'cancelado', sinalStatus: 'expirado' },
  });
  checa('varredura sem token é recusada', expirou.status !== 201, `HTTP ${expirou.status}`);
  checa('agendamento está cancelado', depoisDaVarredura.status === 'cancelado');

  const confirma = await api(
    'POST',
    `/agendamentos/${agendamentoDoJoao!.id}/sinal/confirmar`,
    DONO,
  );
  const restaurado = await prisma.agendamento.findUnique({
    where: { id: agendamentoDoJoao!.id },
  });
  checa(
    'confirmar o sinal atrasado devolve o horário',
    confirma.status === 201,
    `HTTP ${confirma.status}: ${JSON.stringify(confirma.dados)}`,
  );
  checa(
    'e o agendamento NÃO fica cancelado com sinal pago',
    restaurado?.status === 'agendado' && restaurado?.sinalStatus === 'pago',
    `status ${restaurado?.status}, sinal ${restaurado?.sinalStatus}`,
  );

  // ── 5. o filtro da agenda com linha legada (sinalStatus NULO) ───────────
  console.log('\n== 5. agendamento antigo (sinalStatus NULO) continua ocupando ==');
  const legado = new Date(Date.now() + 5 * 86400000);
  legado.setUTCHours(18, 0, 0, 0);
  await prisma.agendamento.create({
    data: {
      data: legado,
      tenantId: dados.tenant.id,
      usuarioId: dados.cliente.id,
      profissionalId: dados.profissional.id,
      status: 'agendado',
      valorTotal: 50,
      servicos: { connect: { id: dados.servico.id } },
      // sinalStatus fica NULO, como em tudo que existia antes da migração
    },
  });

  const emCima = await api('POST', '/publico/prova/agendamentos', undefined, {
    nome: 'Outra Pessoa',
    telefone: '11955554444',
    profissionalId: dados.profissional.id,
    servicos: [dados.servico.id],
    data: legado.toISOString(),
    aceitouTermos: true,
  });
  checa(
    'marcar por cima do horário legado é recusado',
    emCima.status === 400,
    `HTTP ${emCima.status}: ${emCima.dados?.message ?? ''}`,
  );

  // ── 6. série recorrente ─────────────────────────────────────────────────
  console.log('\n== 6. atendimento recorrente ==');
  const serie = await api('POST', '/series', DONO, {
    usuarioId: dados.cliente.id,
    profissionalId: dados.profissional.id,
    servicoIds: [dados.servico.id],
    frequencia: 'semanal',
    diaSemana: 6,
    hora: '10:00',
  });
  checa('cria a série', serie.status === 201, `HTTP ${serie.status}`);
  const criados = serie.dados?.criados?.length ?? 0;
  checa('já materializa horários', criados > 0, `${criados} horários`);

  // O horizonte é o teto. A segunda chamada completa até os 70 dias; a
  // terceira não faz mais nada. Antes, cada clique somava outros oito e a
  // agenda ia parar em janeiro do ano seguinte.
  const serieId = serie.dados?.serie?.id;
  const segunda = await api('POST', `/series/${serieId}/gerar`, DONO);
  const aposSegunda = await prisma.agendamento.count({ where: { serieId } });
  const terceira = await api('POST', `/series/${serieId}/gerar`, DONO);
  const aposTerceira = await prisma.agendamento.count({ where: { serieId } });

  const maisLonge = await prisma.agendamento.findFirst({
    where: { serieId },
    orderBy: { data: 'desc' },
    select: { data: true },
  });
  const diasAFrente = Math.round(
    (maisLonge!.data.getTime() - Date.now()) / 86400000,
  );

  checa(
    'clicar de novo converge, em vez de somar sem parar',
    aposTerceira === aposSegunda,
    `${criados} → ${aposSegunda} → ${aposTerceira}`,
  );
  checa(
    'e a agenda não vai parar no ano que vem',
    diasAFrente <= 70,
    `horário mais distante: ${diasAFrente} dias`,
  );
  checa('a terceira chamada diz que já estava cheia', terceira.dados?.jaEstavaCheia === true);

  const ateTorto = await api('POST', '/series', DONO, {
    usuarioId: dados.cliente.id,
    profissionalId: dados.profissional.id,
    servicoIds: [dados.servico.id],
    frequencia: 'semanal',
    diaSemana: 3,
    hora: '11:00',
    ate: '31/12/2026',
  });
  checa(
    'data de fim em formato brasileiro dá 400, e não 500',
    ateTorto.status === 400,
    `HTTP ${ateTorto.status}: ${ateTorto.dados?.message ?? ''}`,
  );

  // ── 7. chave Pix não some com o sinal ligado ────────────────────────────
  console.log('\n== 7. configuração de recebimento ==');
  const apagar = await api('PUT', '/tenants/me/recebimento', DONO, { chavePix: '' });
  checa(
    'apagar a chave com o sinal ligado é recusado',
    apagar.status === 400,
    `HTTP ${apagar.status}: ${apagar.dados?.message ?? ''}`,
  );

  const ligarSemChave = await api('PUT', '/tenants/me/recebimento', DONO, {
    sinalAtivo: false,
  });
  checa('desligar o sinal é permitido', ligarSemChave.status === 200, `HTTP ${ligarSemChave.status}`);
  const agoraApaga = await api('PUT', '/tenants/me/recebimento', DONO, { chavePix: '' });
  checa('e aí a chave pode ser apagada', agoraApaga.status === 200, `HTTP ${agoraApaga.status}`);

  console.log(`\n==============================`);
  console.log(` ok: ${ok}   falhas: ${falhas}`);
  console.log(`==============================`);

  await app.close();
  await prisma.$disconnect();
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
