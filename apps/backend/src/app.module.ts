import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { ServicoModule } from './servico/servico.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { UsuarioModule } from './usuario/usuario.module';

@Module({
  imports: [DbModule, ServicoModule, AgendamentoModule, UsuarioModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
