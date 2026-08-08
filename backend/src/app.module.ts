import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { ServicoModule } from './servico/servico.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { PlanoModule } from './plano/plano.module';
import { AssinaturaModule } from './assinatura/assinatura.module';
import { AdminModule } from './admin/admin.module';
import { ProfissionalModule } from './profissional/profissional.module';
import { HealthModule } from './health/health.module';
import { LembreteModule } from './lembrete/lembrete.module';
import { BloqueioModule } from './bloqueio/bloqueio.module';
import { LgpdModule } from './lgpd/lgpd.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { WhatsappAgendaModule } from './whatsapp/whatsapp-agenda.module';
import { ProdutoModule } from './produto/produto.module';
import { SerieModule } from './serie/serie.module';
import { PublicoModule } from './publico/publico.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TenantedThrottlerGuard } from './common/tenanted-throttler.guard';

@Module({
  imports: [
    DbModule,
    ServicoModule,
    AgendamentoModule,
    UsuarioModule,
    AuthModule,
    TenantModule,
    PlanoModule,
    AssinaturaModule,
    AdminModule,
    ProfissionalModule,
    HealthModule,
    LembreteModule,
    BloqueioModule,
    LgpdModule,
    WhatsappModule,
    WhatsappAgendaModule,
    ProdutoModule,
    SerieModule,
    PublicoModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: TenantedThrottlerGuard },
  ],
})
export class AppModule {}
