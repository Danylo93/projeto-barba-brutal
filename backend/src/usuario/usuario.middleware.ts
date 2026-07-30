import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UsuarioRepository } from './usuario.repository';
import * as jwt from 'jsonwebtoken';

/** O que o AuthService assina no token. */
interface Cracha {
  id: number;
  tenantId?: number;
  tipo?: 'tenant' | 'usuario' | 'admin';
  email?: string;
  barbeiro?: boolean;
}

/**
 * Descobre quem está do outro lado da requisição e coloca em `req.usuario`.
 *
 * Três coisas que esta versão conserta, todas provadas rodando:
 *
 * 1. **Identidade trocada entre barbearias.** Antes procurava por e-mail SEM
 *    tenantId. Como o schema permite o mesmo e-mail em barbearias diferentes
 *    (@@unique([email, tenantId])), quem tinha conta em duas era resolvido
 *    para a linha errada — a primeira que o Postgres devolvesse. Agora usa o
 *    id do token, que é exato, e confere o tenant.
 *
 * 2. **Dono não conseguia usar a agenda.** O dono só existe na tabela
 *    `tenant`; procurar o e-mail dele em `usuario` dava 401 em toda rota de
 *    agendamento. O controller até tem um caminho para `tipo === 'tenant'`,
 *    mas ele nunca era alcançado.
 *
 * 3. **Token inválido virava 500.** `jwt.verify` lança erro cru; agora vira
 *    401, que é o que o cliente precisa entender para pedir login de novo.
 */
@Injectable()
export class UsuarioMiddleware implements NestMiddleware {
  constructor(private readonly repo: UsuarioRepository) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new HttpException('Token não informado', 401);
    }

    let cracha: Cracha;
    try {
      cracha = jwt.verify(token, process.env.JWT_SECRET!) as Cracha;
    } catch {
      throw new HttpException('Sessão expirada. Entre de novo.', 401);
    }

    // Dono da barbearia: não tem linha em `usuario`, e não precisa ter.
    if (cracha.tipo === 'tenant') {
      (req as any).usuario = {
        id: cracha.id,
        tenantId: cracha.tenantId ?? cracha.id,
        tipo: 'tenant',
        email: cracha.email,
        barbeiro: false,
      };
      return next();
    }

    if (cracha.tipo === 'admin') {
      throw new HttpException(
        'Admin do sistema não movimenta agenda de barbearia.',
        403,
      );
    }

    if (!cracha.tenantId) {
      throw new HttpException('Token sem barbearia.', 401);
    }

    // Pelo id, não pelo e-mail: o id identifica a conta sem ambiguidade, e o
    // tenantId garante que o token de uma barbearia não alcance outra.
    const usuario = await this.repo.buscarNoTenant(cracha.id, cracha.tenantId);
    if (!usuario) {
      throw new HttpException('Usuário não encontrado', 401);
    }

    (req as any).usuario = { ...usuario, tipo: 'usuario' };
    next();
  }
}
