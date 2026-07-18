import { Module } from '@nestjs/common';
import { UsuarioMiddleware } from './usuario.middleware';
import { UsuarioController } from './usuario.controller';
import { DbModule } from 'src/db/db.module';
import { UsuarioRepository } from './usuario.repository';
import { BcryptProvider } from './bcrypt.provider';

@Module({
  imports: [DbModule],
  exports: [UsuarioMiddleware, UsuarioRepository],
  controllers: [UsuarioController],
  providers: [UsuarioMiddleware, UsuarioRepository, BcryptProvider],
})
export class UsuarioModule {}
