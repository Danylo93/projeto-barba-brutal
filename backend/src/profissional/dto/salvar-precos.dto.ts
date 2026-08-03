import { Type } from 'class-transformer';
import { Allow, IsArray, IsInt, ValidateNested } from 'class-validator';

/**
 * Preço de um serviço para um profissional.
 *
 * `preco` usa `@Allow()` de propósito: precisa aceitar número, string com
 * vírgula ("45,90", que é como se digita aqui) e `null` — que é como o
 * profissional volta a cobrar o preço da barbearia. Quem confere de verdade é
 * `validarPrecoInformado`, com mensagem em português; sem o `@Allow` o
 * `whitelist: true` do ValidationPipe global apagaria o campo silenciosamente.
 */
export class LinhaDePrecoDto {
  @Type(() => Number)
  @IsInt({ message: 'Serviço inválido.' })
  servicoId: number;

  @Allow()
  preco?: number | string | null;
}

export class SalvarPrecosDto {
  @IsArray({ message: 'Envie a lista de preços.' })
  @ValidateNested({ each: true })
  @Type(() => LinhaDePrecoDto)
  precos: LinhaDePrecoDto[];
}
