import { IsIn } from 'class-validator';
import { OpcaoDeDominio } from './dominio';

/**
 * O `ValidationPipe` global só valida quando o `@Body()` é uma CLASSE. Com
 * tipo inline não há metadado, nada é conferido, e a opção chegava crua no
 * serviço — que é justamente quem decide se a cobrança é de R$ 29,90 ou de
 * R$ 69,90.
 */
export class DominioPixDto {
  @IsIn(['proprio', 'novo'], {
    message: 'Escolha se você já tem um domínio ou se quer que a gente registre um.',
  })
  opcao: OpcaoDeDominio;
}
