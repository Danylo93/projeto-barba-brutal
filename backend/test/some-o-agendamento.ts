/**
 * Reprodução do relato: "o cliente marca sem estar logado, e o horário não
 * aparece pro barbeiro, não aparece pro cliente, e continua livre na tela".
 *
 * Os três sintomas juntos cheiram a uma causa só. Este script marca um horário
 * pela rota pública e, EM SEGUIDA, olha pelos três lados — disponibilidade,
 * agenda do dono e lista do cliente — sem esperar nada, para separar "sumiu"
 * de "expirou porque o horário passou".
 *
 * Como rodar (o Postgres do sistema serve):
 *
 *     su postgres -c "psql -c 'DROP DATABASE IF EXISTS somiu;' -c 'CREATE DATABASE somiu;'"
 *     cd backend
 *     export PGURL="postgresql://postgres@localhost:5432/somiu"
 *     DATABASE_URL="$PGURL" DIRECT_URL="$PGURL" npx prisma migrate deploy
 *     DATABASE_URL="$PGURL" DIRECT_URL="$PGURL" JWT_SECRET="prova" \
 *       npx ts-node -r tsconfig-paths/register test/some-o-agendamento.ts
 */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BASE = 'http://127.0.0.1:3998';

let ok = 0;
let falhas = 0;
function checa(titulo: string, condicao: boolean, detalhe = '') {
  const marca = condicao ? '\x1b[32mok   \x1b[0m' : '\x1b[31mFALHA\x1b[0m';
  console.log(`  ${marca} ${titulo}${detalhe ? ` — ${detalhe}` : ''}`);
  condicao ? ok++ : falhas++;
}

async function api(metodo: string, rota: string, token?: string, corpo?: unknown) {
  const r = await fetch(`${BASE}${rota}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await r.text();
  let dados: any = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }
  return { status: r.status, dados };
}

/** "2026-08-08" e "08:30" em Brasília → o instante que o navegador manda. */
function instanteBrasilia(dia: string, hora: string): string {
  return new Date(`${dia}T${hora}:00-03:00`).toISOString();
}

/** O dia de hoje em Brasília, no formato que a tela usa. */
function hojeEmBrasilia(base = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base);
}

/** Uma hora cheia daqui a N horas, em Brasília — sempre no futuro. */
function horaDaqui(horas: number, base = new Date()): { dia: string; hora: string } {
  const alvo = new Date(base.getTime() + horas * 3_600_000);
  const dia = hojeEmBrasilia(alvo);
  const hh = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  }).format(alvo);
  return { dia, hora: `${hh}:00` };
}

async function semear() {
  for (const tabela of [
    'movimentoEstoque',
    'produto',
    'agendamento',
    'serieAgendamento',
    'profissional',
    'bloqueio',
    'servico',
    'usuario',
    'assinatura',
    'tenant',
    'plano',
  ]) {
    await (prisma as any)[tabela].deleteMany({});
  }

  // O Básico, que é o plano da barbearia do relato.
  const plano = await prisma.plano.create({
    data: {
      nome: 'Básico',
      descricao: 'Para quem trabalha sozinho',
      preco: 49.9,
      duracao: 30,
      maxUsuarios: 1,
      maxAgendamentos: 999999,
      features: ['1 profissional'],
      grupo: 'basico',
      periodicidade: 'mensal',
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      nome: 'Lá Tita',
      email: 'dono@latita.test',
      telefone: '31999990000',
      senha: await bcrypt.hash('#Senha123', 10),
      dominio: 'latita',
      cnpj: '11222333000181',
      // A barbearia do relato NÃO cobra sinal — é o padrão.
      sinalAtivo: false,
      configuracoes: {
        horarios: {
          '0': { aberto: false },
          '1': { aberto: true, abertura: '08:00', fechamento: '21:00' },
          '2': { aberto: true, abertura: '08:00', fechamento: '21:00' },
          '3': { aberto: true, abertura: '08:00', fechamento: '21:00' },
          '4': { aberto: true, abertura: '08:00', fechamento: '21:00' },
          '5': { aberto: true, abertura: '08:00', fechamento: '21:00' },
          '6': { aberto: true, abertura: '08:00', fechamento: '21:00' },
        },
      },
    },
  });

  await prisma.assinatura.create({
    data: {
      tenantId: tenant.id,
      planoId: plano.id,
      status: 'active',
      dataInicio: new Date(),
      dataFim: new Date(Date.now() + 30 * 86400000),
    },
  });

  // O barbeiro é DUAS linhas: o login (Usuario) e a ficha na vitrine
  // (Profissional). É a ficha que a agenda referencia.
  const login = await prisma.usuario.create({
    data: {
      nome: 'Danylo Oliveira',
      email: 'danylo@latita.test',
      senha: await bcrypt.hash('#Senha123', 10),
      telefone: '31988887777',
      barbeiro: true,
      tenantId: tenant.id,
      ativo: true,
    },
  });

  const profissional = await prisma.profissional.create({
    data: {
      nome: 'Danylo Oliveira',
      descricao: 'Barbeiro',
      tenantId: tenant.id,
      usuarioId: login.id,
      ativo: true,
    },
  });

  const servico = await prisma.servico.create({
    data: {
      nome: 'Corte de Cabelo',
      descricao: 'Corte na tesoura e na máquina',
      preco: 45,
      qtdeSlots: 1,
      tenant: { connect: { id: tenant.id } },
      ativo: true,
      profissionais: { connect: { id: profissional.id } },
    },
  });

  return { tenant, profissional, servico, login };
}

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  app.set('trust proxy', 1);
  await app.listen(3998, '127.0.0.1');

  const { tenant, profissional, servico } = await semear();

  // Duas horas à frente: é o cenário do print — marcou 08:30 e olhou 06:33.
  const { dia, hora } = horaDaqui(2);
  console.log(`\n== marcando ${dia} às ${hora} (Brasília), agora é ${new Date().toISOString()} ==`);

  const marcado = await api('POST', `/publico/${tenant.dominio}/agendamentos`, undefined, {
    nome: 'Cliente Sem Conta',
    telefone: '31977776666',
    profissionalId: profissional.id,
    servicos: [servico.id],
    data: instanteBrasilia(dia, hora),
    aceitouTermos: true,
  });
  checa('a API aceita o agendamento sem login', marcado.status === 201, `HTTP ${marcado.status}`);
  if (marcado.status !== 201) {
    console.log('   resposta:', JSON.stringify(marcado.dados));
  }

  const noBanco = await prisma.agendamento.findFirst({
    where: { tenantId: tenant.id },
    include: { servicos: true },
  });
  checa('gravou no banco', !!noBanco, noBanco ? `id ${noBanco.id}` : 'nada');
  if (noBanco) {
    console.log(
      `   data=${noBanco.data.toISOString()} status=${noBanco.status} ` +
        `sinalStatus=${noBanco.sinalStatus} sinalValor=${noBanco.sinalValor}`,
    );
  }

  // ── 1. o horário some da lista de livres? ────────────────────────────────
  console.log('\n== 1. a tela pública ==');
  const livres = await api('GET', `/publico/${tenant.dominio}/horarios/${profissional.id}/${dia}`);
  const ocupados: string[] = livres.dados?.ocupados ?? [];
  checa(
    'o horário marcado aparece como ocupado',
    ocupados.includes(hora),
    `ocupados = [${ocupados.join(', ')}]`,
  );

  // ── 2. o dono vê na agenda dele? ─────────────────────────────────────────
  console.log('\n== 2. o painel do dono ==');
  const login = await api('POST', '/auth/login', undefined, {
    email: tenant.email,
    senha: '#Senha123',
  });
  const token = login.dados?.access_token;
  checa('o dono entra', !!token, `HTTP ${login.status}`);

  const agenda = await api('GET', '/tenants/me/agendamentos', token);
  const lista: any[] = Array.isArray(agenda.dados) ? agenda.dados : (agenda.dados?.data ?? []);
  checa(
    'o dono vê o agendamento',
    lista.some((a) => a.id === noBanco?.id),
    `HTTP ${agenda.status}, ${lista.length} agendamento(s)`,
  );

  // ── 3. o barbeiro vê na agenda dele? ─────────────────────────────────────
  console.log('\n== 3. a agenda do barbeiro ==');
  const doProfissional = await prisma.agendamento.findMany({
    where: { profissionalId: profissional.id, tenantId: tenant.id },
  });
  checa(
    'o agendamento está vinculado ao profissional certo',
    doProfissional.length === 1,
    `${doProfissional.length} para o profissional ${profissional.id}`,
  );

  // ── 4. o cliente sem conta consegue reencontrar? ─────────────────────────
  console.log('\n== 4. o cliente sem conta ==');
  const dono = await prisma.usuario.findFirst({ where: { telefone: '31977776666' } });
  checa('a conta sem cadastro foi criada', !!dono, dono ? `id ${dono.id}` : 'nenhuma');
  checa('e ela está marcada como semCadastro', dono?.semCadastro === true, String(dono?.semCadastro));

  console.log(`\n${ok} ok, ${falhas} falha(s)\n`);
  await app.close();
  await prisma.$disconnect();
  process.exit(falhas ? 1 : 0);
}

main().catch(async (erro) => {
  console.error(erro);
  await prisma.$disconnect();
  process.exit(1);
});
