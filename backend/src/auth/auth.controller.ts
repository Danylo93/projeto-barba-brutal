import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('tenant/login')
  loginTenant(@Body() data: { email: string; senha: string }) {
    return this.authService.loginTenant(data.email, data.senha);
  }

  @Post('tenant/register')
  registerTenant(@Body() data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    endereco?: string;
    cnpj?: string;
  }) {
    return this.authService.registerTenant(data);
  }

  @Post('usuario/login')
  loginUsuario(@Body() data: {
    email: string;
    senha: string;
    tenantId: number;
  }) {
    return this.authService.loginUsuario(data.email, data.senha, data.tenantId);
  }

  @Post('usuario/register')
  registerUsuario(@Body() data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    barbeiro: boolean;
    tenantId: number;
  }) {
    return this.authService.registerUsuario(data);
  }

  @Post('admin/login')
  loginAdmin(@Body() data: { email: string; senha: string }) {
    return this.authService.loginAdmin(data.email, data.senha);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
