import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Validação das rotas de entrada.
 *
 * Existe pelo mesmo motivo de `servico.dto.ts`: o `ValidationPipe` global só
 * valida quando o `@Body()` é uma CLASSE. Com tipo declarado inline não há
 * metadado, nada é conferido, e o corpo malformado ia cru para o Prisma —
 * `POST /auth/usuario/login` sem `tenantId` respondia 500 (e, fora de
 * produção, com trecho do código-fonte no corpo) onde cabia um 400.
 */

const EMAIL_INVALIDO = { message: 'Informe um e-mail válido.' };
const SENHA_OBRIGATORIA = { message: 'Informe a senha.' };

export class LoginTenantDto {
  @IsEmail({}, EMAIL_INVALIDO)
  @MaxLength(160, EMAIL_INVALIDO)
  email: string;

  @IsString(SENHA_OBRIGATORIA)
  @IsNotEmpty(SENHA_OBRIGATORIA)
  @MaxLength(200, SENHA_OBRIGATORIA)
  senha: string;
}

/** O admin do SaaS entra pelas mesmas credenciais, em rota separada. */
export class LoginAdminDto extends LoginTenantDto {}

export class LoginUsuarioDto extends LoginTenantDto {
  // Cliente e barbeiro existem DENTRO de uma barbearia: sem o tenant não dá
  // para saber de quem é a conta.
  @Type(() => Number)
  @IsInt({ message: 'Barbearia não informada. Entre pelo link da sua barbearia.' })
  @Min(1, { message: 'Barbearia não informada. Entre pelo link da sua barbearia.' })
  tenantId: number;
}

export class RegistrarUsuarioDto {
  @IsString({ message: 'Informe seu nome.' })
  @MinLength(2, { message: 'Informe seu nome completo.' })
  @MaxLength(120, { message: 'O nome é longo demais.' })
  nome: string;

  @IsEmail({}, EMAIL_INVALIDO)
  @MaxLength(160, EMAIL_INVALIDO)
  email: string;

  @IsString({ message: 'Informe o telefone.' })
  @MinLength(8, { message: 'Informe um telefone válido, com DDD.' })
  @MaxLength(20, { message: 'Informe um telefone válido, com DDD.' })
  telefone: string;

  @IsString(SENHA_OBRIGATORIA)
  @MinLength(6, { message: 'A senha precisa de ao menos 6 caracteres.' })
  @MaxLength(200, SENHA_OBRIGATORIA)
  senha: string;

  @Type(() => Number)
  @IsInt({ message: 'Barbearia não informada. Use o link da sua barbearia.' })
  @Min(1, { message: 'Barbearia não informada. Use o link da sua barbearia.' })
  tenantId: number;
}

export class RegistrarTenantDto {
  @IsString({ message: 'Informe o nome da barbearia.' })
  @MinLength(2, { message: 'O nome da barbearia é curto demais.' })
  @MaxLength(120, { message: 'O nome da barbearia é longo demais.' })
  nome: string;

  @IsEmail({}, EMAIL_INVALIDO)
  @MaxLength(160, EMAIL_INVALIDO)
  email: string;

  @IsString({ message: 'Informe o telefone da barbearia.' })
  @MinLength(8, { message: 'Informe um telefone válido, com DDD.' })
  @MaxLength(20, { message: 'Informe um telefone válido, com DDD.' })
  telefone: string;

  @IsString(SENHA_OBRIGATORIA)
  @MinLength(6, { message: 'A senha precisa de ao menos 6 caracteres.' })
  @MaxLength(200, SENHA_OBRIGATORIA)
  senha: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'O endereço é longo demais.' })
  endereco?: string;

  /** CPF ou CNPJ — identificador único da barbearia. Os dígitos são
   *  conferidos no service, que já devolve mensagem própria. */
  @IsString({ message: 'Informe o CPF ou CNPJ da barbearia.' })
  @IsNotEmpty({ message: 'Informe o CPF ou CNPJ da barbearia.' })
  @MaxLength(20, { message: 'Informe um CPF ou CNPJ válido.' })
  documento: string;
}
