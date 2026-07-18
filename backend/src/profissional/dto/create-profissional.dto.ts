import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEmail, MinLength, IsArray, IsInt } from 'class-validator';

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

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  servicoIds?: number[];
}
