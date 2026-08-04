import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RecuperacaoService } from './recuperacao.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import {
  LoginAdminDto,
  LoginTenantDto,
  LoginUsuarioDto,
  RegistrarTenantDto,
  RegistrarUsuarioDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recuperacao: RecuperacaoService,
  ) {}

  @Post('tenant/login')
  loginTenant(@Body() data: LoginTenantDto) {
    return this.authService.loginTenant(data.email, data.senha);
  }

  @Post('tenant/register')
  registerTenant(@Body() data: RegistrarTenantDto) {
    return this.authService.registerTenant(data);
  }

  @Post('usuario/login')
  loginUsuario(@Body() data: LoginUsuarioDto) {
    return this.authService.loginUsuario(data.email, data.senha, data.tenantId);
  }

  /** Cadastro público de cliente. `barbeiro` não é aceito daqui — ver o service. */
  @Post('usuario/register')
  registerUsuario(@Body() data: RegistrarUsuarioDto) {
    return this.authService.registerUsuario(data);
  }

  @Post('admin/login')
  loginAdmin(@Body() data: LoginAdminDto) {
    return this.authService.loginAdmin(data.email, data.senha);
  }

  /*
   * Apelidos das rotas antigas de recuperação de senha.
   *
   * A implementação de verdade mora em `RecuperacaoService` (/auth/senha/*),
   * que guarda o hash do token em vez do token e tem limite próprio de
   * tentativas. Estas duas rotas continuam de pé só para o frontend que já
   * está no ar não tomar 404 enquanto o deploy novo não sobe — o corpo aceita
   * tanto `senha` quanto o `novaSenha` que a versão antiga mandava.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('recuperar-senha')
  recuperarSenha(@Body() data: { email: string; tenantId?: number }) {
    return this.recuperacao.solicitar(data?.email, data?.tenantId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('redefinir-senha')
  redefinirSenha(@Body() data: { token: string; senha?: string; novaSenha?: string }) {
    return this.recuperacao.redefinir(data?.token, data?.senha ?? data?.novaSenha);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
