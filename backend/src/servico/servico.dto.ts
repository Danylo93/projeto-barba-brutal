import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Validação do serviço.
 *
 * Existe porque o `ValidationPipe` global só valida quando o `@Body()` é uma
 * CLASSE: com tipo declarado inline não há metadado, nada é conferido, e um
 * `preco: "dez"` chegava direto ao Prisma e virava 500.
 */
export class CriarServicoDto {
  @IsString({ message: 'Informe o nome do serviço.' })
  @MinLength(2, { message: 'O nome do serviço é curto demais.' })
  @MaxLength(80, { message: 'O nome do serviço é longo demais.' })
  nome: string;

  @IsString({ message: 'Informe a descrição do serviço.' })
  @MaxLength(300, { message: 'A descrição é longa demais.' })
  descricao: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Informe o preço em números (ex.: 45 ou 45.90).' })
  @Min(0, { message: 'O preço não pode ser negativo.' })
  @Max(100000, { message: 'Preço fora do limite permitido.' })
  preco: number;

  @Type(() => Number)
  @IsInt({ message: 'A duração deve ser um número inteiro de blocos de 30 min.' })
  @Min(1, { message: 'O serviço precisa de ao menos um bloco de 30 minutos.' })
  @Max(48, { message: 'Um serviço não pode passar de 24 horas.' })
  qtdeSlots: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagemURL?: string;

  @IsOptional()
  @IsBoolean({ message: 'Combo deve ser verdadeiro ou falso.' })
  ehCombo?: boolean;
}

/** Na edição todo campo é opcional, mas o que vier continua sendo validado. */
export class AtualizarServicoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descricao?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Informe o preço em números (ex.: 45 ou 45.90).' })
  @Min(0)
  @Max(100000)
  preco?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A duração deve ser um número inteiro de blocos de 30 min.' })
  @Min(1)
  @Max(48)
  qtdeSlots?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagemURL?: string;

  @IsOptional()
  @IsBoolean()
  ehCombo?: boolean;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
