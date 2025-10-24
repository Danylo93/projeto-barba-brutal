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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
