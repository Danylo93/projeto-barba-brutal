/**
 * DTOs de Autenticação
 * Data Transfer Objects para validação de entrada
 */

import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;
}

export class RegisterTenantDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  senha: string;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  telefone?: string;

  @IsOptional()
  @IsString({ message: 'CNPJ deve ser uma string' })
  cnpj?: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Token deve ser uma string' })
  refreshToken: string;
}

/**
 * DTO para resposta de erro de assinatura
 */
export class SubscriptionErrorDto {
  success: boolean = false;
  error: {
    code: string;
    message: string;
    type: 'NO_SUBSCRIPTION' | 'INACTIVE_SUBSCRIPTION' | 'EXPIRED_SUBSCRIPTION' | 'INVALID_PLAN';
  };
  timestamp: string;
}

/**
 * DTO para resposta de login com validação de assinatura
 */
export class LoginResponseDto {
  access_token: string;
  usuario?: any;
  tenant?: any;
  admin?: any;
  subscription?: {
    hasSubscription: boolean;
    isActive: boolean;
    status: string;
    plano: string;
    diasRestantes: number;
  };
}

