import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { DbModule } from '../db/db.module';
import { SubscriptionValidationService } from '../common/services/subscription-validation.service';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { RecuperacaoController } from './recuperacao.controller';
import { RecuperacaoService } from './recuperacao.service';

@Module({
  imports: [
    DbModule,
    PassportModule,
    NotificacaoModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15d' },
    }),
  ],
  controllers: [AuthController, RecuperacaoController],
  providers: [AuthService, JwtStrategy, SubscriptionValidationService, RecuperacaoService],
  exports: [AuthService, SubscriptionValidationService],
})
export class AuthModule {}
