import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsEmail, MinLength, IsArray, IsInt } from 'class-validator';

export class CreateProfissionalDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsString()
  @IsOptional()
  imagemUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  avaliacao?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  quantidadeAvaliacoes?: number;

  /**
   * Obrigatório: é com ele que o barbeiro entra na própria agenda. Antes era
   * opcional e o profissional ficava sem acesso nenhum, sem ninguém perceber.
   */
  @IsEmail({}, { message: 'Informe um e-mail válido para o profissional.' })
  @IsNotEmpty({ message: 'O e-mail do profissional é obrigatório.' })
  email: string;

  /** Obrigatório junto com o e-mail — sem senha a conta de acesso não nasce. */
  @IsString({ message: 'Informe a senha de acesso do profissional.' })
  @IsNotEmpty({ message: 'Informe a senha de acesso do profissional.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  servicoIds?: number[];

  /** Percentual de comissão do profissional (0 a 100). */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  comissaoPercent?: number;
}
