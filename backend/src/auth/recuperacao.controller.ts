import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RecuperacaoService } from './recuperacao.service';
import { RedefinirSenhaDto, SolicitarRecuperacaoDto } from './recuperacao.dto';

@Controller('auth/senha')
export class RecuperacaoController {
  constructor(private readonly service: RecuperacaoService) {}

  /**
   * Pede o link de recuperação. Aberto de propósito — é para quem NÃO
   * consegue entrar.
   *
   * O limite global (60/min) é largo demais aqui: quem sabe o e-mail do dono
   * conseguiria encher a caixa dele de "redefinir sua senha" até ele desistir
   * do sistema. 5 por minuto cobre quem errou o e-mail e tentou de novo.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('recuperar')
  recuperar(@Body() body: SolicitarRecuperacaoDto) {
    return this.service.solicitar(body.email, body.tenantId);
  }

  /** Limite apertado também: sem isso, dá para varrer token no chute. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('redefinir')
  redefinir(@Body() body: RedefinirSenhaDto) {
    return this.service.redefinir(body.token, body.senha);
  }
}
