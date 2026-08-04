import {
  guardarEnderecoAntigo,
  MAX_ENDERECOS_ANTIGOS,
  MAX_SLUG,
  normalizarSlug,
  problemaAntesDeNormalizar,
  problemaDoSlug,
  slugDisponivel,
  slugUtilizavel,
} from './slug';

describe('normalizar', () => {
  it('tira acento, espaço e maiúscula', () => {
    expect(normalizarSlug('Barbearia do Marcão')).toBe('barbearia-do-marcao');
    expect(normalizarSlug('  Lá Tita  ')).toBe('la-tita');
  });

  it('não deixa ponto virar subdomínio de brinde', () => {
    // "evil.barbearia" viraria um nível a mais no DNS.
    expect(normalizarSlug('evil.barbearia')).toBe('evil-barbearia');
  });

  it('descarta o que não é letra, número ou hífen', () => {
    expect(normalizarSlug('cor+te/barba?x=1')).toBe('cortebarbax1');
    expect(normalizarSlug('../../etc/passwd')).toBe('etcpasswd');
  });

  it('não sobra hífen nas pontas nem repetido', () => {
    expect(normalizarSlug('--barba---brutal--')).toBe('barba-brutal');
  });

  it('corta no limite de um rótulo de DNS', () => {
    const gerado = normalizarSlug('a'.repeat(120));
    expect(gerado.length).toBe(MAX_SLUG);
  });
});

describe('slug reservado', () => {
  // O caso que motivou tudo: "Barbearia WWW" ficaria com www.barbeariabrutal.com.
  it('recusa nomes de infraestrutura', () => {
    for (const s of ['www', 'api', 'app', 'admin', 'cdn', 'status']) {
      expect(slugUtilizavel(s)).toBe(false);
    }
  });

  it('recusa nomes de e-mail — quebrariam a entrega', () => {
    for (const s of ['mail', 'smtp', 'mx1', 'autodiscover', 'dkim', 'dmarc']) {
      expect(slugUtilizavel(s)).toBe(false);
    }
  });

  // São os endereços que um golpista escolheria para pedir senha em nome da marca.
  it('recusa nomes que passariam por oficiais', () => {
    for (const s of ['login', 'conta', 'suporte', 'pagamento', 'seguranca']) {
      expect(slugUtilizavel(s)).toBe(false);
    }
  });

  it('deixa passar nome de barbearia de verdade', () => {
    for (const s of ['latita', 'barbearia-do-marcao', 'corte-fino-2']) {
      expect(problemaDoSlug(s)).toBeNull();
    }
  });
});

describe('formato', () => {
  it('recusa curto demais e longo demais', () => {
    expect(problemaDoSlug('ab')).toMatch(/pelo menos/);
    expect(problemaDoSlug('a'.repeat(64))).toMatch(/no máximo/);
  });

  it('recusa hífen nas pontas — não é rótulo de DNS válido', () => {
    expect(problemaDoSlug('-latita')).toMatch(/letras, números e hífen/);
    expect(problemaDoSlug('latita-')).toMatch(/letras, números e hífen/);
  });

  it('recusa o que já veio sujo do corpo da requisição', () => {
    expect(problemaDoSlug('LaTita')).not.toBeNull();
    expect(problemaDoSlug('la tita')).not.toBeNull();
    expect(problemaDoSlug('la.tita')).not.toBeNull();
  });

  // Endereço em punycode consegue imitar outro com letras parecidas. Precisa
  // ser barrado ANTES de normalizar: a normalização junta `--` em `-`, o
  // prefixo some, e o que era uma tentativa vira um endereço qualquer.
  it('recusa punycode antes de normalizar', () => {
    expect(problemaAntesDeNormalizar('xn--brbara-6qa')).toMatch(/não é aceito/);
    expect(problemaAntesDeNormalizar('  XN--brbara-6qa  ')).toMatch(/não é aceito/);
    expect(problemaAntesDeNormalizar('latita')).toBeNull();
    // Depois de normalizar já não dá para reconhecer — é por isso que existe
    // uma conferência separada.
    expect(normalizarSlug('xn--brbara-6qa')).toBe('xn-brbara-6qa');
  });

  it('a mensagem diz o que fazer, não só que está errado', () => {
    expect(problemaDoSlug('www')).toBe(
      'Este endereço é reservado pelo sistema. Escolha outro.',
    );
  });
});

describe('escolha automática no cadastro', () => {
  const nunca = async () => false;

  it('usa o nome da barbearia', async () => {
    expect(await slugDisponivel('Barbearia do Marcão', nunca)).toBe(
      'barbearia-do-marcao',
    );
  });

  it('desvia quando já existe', async () => {
    const usados = new Set(['latita', 'latita-1']);
    expect(await slugDisponivel('Latita', async (s) => usados.has(s))).toBe(
      'latita-2',
    );
  });

  // Sem isto, "Barbearia Mail" recebia o slug `mail` calado.
  it('desvia de reservado, sem tentar o reservado para sempre', async () => {
    expect(await slugDisponivel('Mail', nunca)).toBe('mail-1');
    expect(await slugDisponivel('WWW', nunca)).toBe('www-1');
  });

  it('nome que some na normalização vira algo utilizável', async () => {
    const gerado = await slugDisponivel('!!! ###', nunca);
    expect(slugUtilizavel(gerado)).toBe(true);
    expect(gerado.startsWith('barbearia')).toBe(true);
  });

  it('nome gigante ainda cabe num rótulo de DNS', async () => {
    const gerado = await slugDisponivel('Barbearia ' + 'a'.repeat(200), nunca);
    expect(gerado.length).toBeLessThanOrEqual(MAX_SLUG);
    expect(slugUtilizavel(gerado)).toBe(true);
  });
});

describe('histórico de endereços', () => {
  it('guarda o que saiu de uso', () => {
    expect(guardarEnderecoAntigo([], 'latita')).toEqual(['latita']);
    expect(guardarEnderecoAntigo(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('não repete', () => {
    expect(guardarEnderecoAntigo(['latita'], 'latita')).toEqual(['latita']);
  });

  // Sem teto, trocar de endereço vira forma de cativar nome: cada troca
  // reserva o anterior para sempre.
  it('não deixa a lista crescer sem fim', () => {
    let lista: string[] = [];
    for (let i = 0; i < 30; i++) lista = guardarEnderecoAntigo(lista, `e${i}`);
    expect(lista.length).toBe(MAX_ENDERECOS_ANTIGOS);
    expect(lista[lista.length - 1]).toBe('e29');
  });

  it('aguenta lista ausente', () => {
    expect(guardarEnderecoAntigo(null, 'x')).toEqual(['x']);
    expect(guardarEnderecoAntigo(undefined, 'x')).toEqual(['x']);
  });
});
