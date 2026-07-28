import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Autenticação opcional: se vier um token válido, popula `req.user`; se não
 * vier nenhum, ou vier um inválido, deixa a requisição seguir sem usuário.
 *
 * Serve para o banner de consentimento, que aparece antes de qualquer login
 * mas precisa amarrar o registro ao titular quando ele já está logado.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
