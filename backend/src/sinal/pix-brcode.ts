/**
 * Gerador de Pix "copia e cola" (BR Code / EMV), padrão do Banco Central.
 *
 * Função pura: não depende de API, credencial ou internet. O pagamento cai
 * direto na conta da barbearia (a chave Pix é dela), então o SaaS não
 * intermedia dinheiro — o dono só confirma o recebimento no painel.
 *
 * Referência do formato: EMV® QRCPS-MPM, com os IDs usados pelo Pix.
 */

/** Monta um campo TLV: id + tamanho (2 dígitos) + valor. */
function campo(id: string, valor: string): string {
  const tamanho = String(valor.length).padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

/**
 * CRC16/CCITT-FALSE — exigido no fim do BR Code (campo 63).
 * Polinômio 0x1021, valor inicial 0xFFFF.
 */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Remove acentos e caracteres fora do permitido, e corta no tamanho máximo.
 * Nome do recebedor e cidade só aceitam ASCII no BR Code.
 */
function sanitizar(texto: string, max: number): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();
}

/** Identificador da transação: só letras/números, até 25 caracteres. */
function sanitizarTxid(txid?: string): string {
  const limpo = (txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  return limpo || '***';
}

export interface DadosPix {
  /** Chave Pix do recebedor (CPF/CNPJ, e-mail, telefone ou aleatória). */
  chave: string;
  /** Nome de quem recebe (barbearia). */
  nome: string;
  /** Cidade do recebedor. */
  cidade?: string;
  /** Valor em reais. Omitido/0 gera um Pix de valor livre. */
  valor?: number;
  /** Identificador da cobrança (aparece no extrato). */
  txid?: string;
  /** Texto livre exibido para o pagador. */
  descricao?: string;
}

/**
 * Gera o payload "copia e cola" do Pix.
 * O mesmo texto pode virar QR Code no front, se desejado.
 */
export function gerarPixCopiaECola({
  chave,
  nome,
  cidade = 'SAO PAULO',
  valor,
  txid,
  descricao,
}: DadosPix): string {
  if (!chave || !chave.trim()) {
    throw new Error('Chave Pix é obrigatória.');
  }

  // Merchant Account Information (26): GUI do Pix + chave (+ descrição)
  const gui = campo('00', 'br.gov.bcb.pix');
  const chaveCampo = campo('01', chave.trim());
  const descricaoCampo = descricao ? campo('02', sanitizar(descricao, 72)) : '';
  const merchant = campo('26', `${gui}${chaveCampo}${descricaoCampo}`);

  const partes = [
    campo('00', '01'), // Payload Format Indicator
    merchant,
    campo('52', '0000'), // Merchant Category Code (não informado)
    campo('53', '986'), // Moeda: BRL
  ];

  if (typeof valor === 'number' && valor > 0) {
    partes.push(campo('54', valor.toFixed(2)));
  }

  partes.push(
    campo('58', 'BR'), // País
    campo('59', sanitizar(nome, 25) || 'RECEBEDOR'), // Nome do recebedor
    campo('60', sanitizar(cidade, 15) || 'SAO PAULO'), // Cidade
    campo('62', campo('05', sanitizarTxid(txid))), // Additional Data (txid)
  );

  // O CRC é calculado sobre o payload já contendo "6304".
  const semCrc = `${partes.join('')}6304`;
  return `${semCrc}${crc16(semCrc)}`;
}

/** Confere se um payload de Pix tem CRC válido (útil em teste e depuração). */
export function pixValido(payload: string): boolean {
  if (!payload || payload.length < 8) return false;
  const corpo = payload.slice(0, -4);
  const crcInformado = payload.slice(-4).toUpperCase();
  return corpo.endsWith('6304') && crc16(corpo) === crcInformado;
}

/**
 * Validação simples da chave Pix, para avisar o dono antes de salvar.
 * Aceita CPF, CNPJ, e-mail, telefone (+55...) e chave aleatória (UUID).
 */
export function validarChavePix(chave: string): boolean {
  const c = (chave || '').trim();
  if (!c) return false;
  const somenteDigitos = c.replace(/\D/g, '');
  if (/^[0-9]{11}$/.test(somenteDigitos) && !c.includes('+')) return true; // CPF
  if (/^[0-9]{14}$/.test(somenteDigitos)) return true; // CNPJ
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) return true; // e-mail
  if (/^\+55[0-9]{10,11}$/.test(c.replace(/[\s()-]/g, ''))) return true; // telefone
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return true;
  return false;
}
