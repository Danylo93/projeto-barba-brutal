import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { DbModule } from '../db/db.module';
import { SubscriptionValidationService } from '../common/services/subscription-validation.service';

@Module({
  imports: [
    DbModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SubscriptionValidationService],
  exports: [AuthService, SubscriptionValidationService],
})
export class AuthModule {}
