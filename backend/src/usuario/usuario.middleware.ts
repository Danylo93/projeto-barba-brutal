import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UsuarioRepository } from './usuario.repository';
import * as jwt from 'jsonwebtoken';
import { Usuario } from '@barba/core';

@Injectable()
export class UsuarioMiddleware implements NestMiddleware {
  constructor(private readonly repo: UsuarioRepository) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new HttpException('Token não informado', 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as Usuario;
    const usuario = await this.repo.buscarPorEmail(payload.email!);

    if (!usuario) {
      throw new HttpException('Usuário não encontrado', 401);
    }

    (req as any).usuario = usuario;
    next();
  }
}
