import { IsString, IsOptional, IsNumber, Min, IsBoolean, IsEmail, MinLength } from 'class-validator';

export class UpdateProfissionalDto {
  @IsString()
  @IsOptional()
  nome?: string;

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

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  @IsOptional()
  senha?: string;

  @IsString()
  @IsOptional()
  telefone?: string;
}
