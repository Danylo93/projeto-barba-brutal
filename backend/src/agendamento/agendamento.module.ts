import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AgendamentoController } from './agendamento.controller';
import { AgendamentoRepository } from './agendamento.repository';
import { DbModule } from 'src/db/db.module';
import { UsuarioModule } from 'src/usuario/usuario.module';
import { UsuarioMiddleware } from 'src/usuario/usuario.middleware';

@Module({
  imports: [DbModule, UsuarioModule],
  controllers: [AgendamentoController],
  providers: [AgendamentoRepository],
})
export class AgendamentoModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UsuarioMiddleware).forRoutes(AgendamentoController);
  }
}
