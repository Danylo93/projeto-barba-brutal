import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class SolicitarRecuperacaoDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  /** Cliente e barbeiro têm e-mail repetido entre barbearias; o dono não. */
  @IsOptional()
  @IsInt()
  tenantId?: number;
}

export class RedefinirSenhaDto {
  @IsString({ message: 'Link inválido.' })
  token: string;

  @IsString({ message: 'Informe a nova senha.' })
  @MinLength(6, { message: 'A nova senha precisa ter ao menos 6 caracteres.' })
  senha: string;
}
