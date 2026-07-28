'use client'

/**
 * Onde os direitos da LGPD viram botão.
 *
 * Listar direito em política de privacidade não é cumprir a lei — o art. 18
 * fala em *exercício* facilitado. Aqui o titular baixa os próprios dados,
 * revê o que consentiu e pede exclusão sem depender de e-mail para ninguém.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, ShieldCheck, Trash2, Check, X } from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import useUsuario from '@/data/hooks/useUsuario'
import Cabecalho from '@/components/shared/Cabecalho'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { limparConsentimento, lerConsentimento } from '@/lib/consentimento'

interface Consentimento {
    id: number
    tipo: string
    versao: string
    aceito: boolean
    createdAt: string
}

const ROTULO: Record<string, string> = {
    cookies_analise: 'Cookies de análise de uso',
    cookies_marketing: 'Cookies de marketing',
    termos_de_uso: 'Termos de uso',
    politica_privacidade: 'Política de privacidade',
}

export default function MeusDadosPage() {
    const { usuario } = useUsuario()
    const { httpGet, httpPost } = useAPI()
    const { success, error: toastErro } = useToast()

    const [consentimentos, setConsentimentos] = useState<Consentimento[]>([])
    const [carregando, setCarregando] = useState(true)
    const [baixando, setBaixando] = useState(false)
    const [confirmarExclusao, setConfirmarExclusao] = useState(false)
    const [motivo, setMotivo] = useState('')
    const [pedidoFeito, setPedidoFeito] = useState(false)

    const carregar = useCallback(async () => {
        try {
            setCarregando(true)
            const c = await httpGet('lgpd/meus-consentimentos')
            setConsentimentos(Array.isArray(c) ? c : [])
        } catch (e) {
            toastErro('Erro ao carregar', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setCarregando(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [httpGet])

    useEffect(() => {
        carregar()
    }, [carregar])

    async function baixarDados() {
        try {
            setBaixando(true)
            const dados = await httpGet('lgpd/meus-dados')
            const blob = new Blob([JSON.stringify(dados, null, 2)], {
                type: 'application/json;charset=utf-8',
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
            success('Download iniciado', 'O arquivo tem tudo que guardamos sobre você.')
        } catch (e) {
            toastErro('Erro ao exportar', e instanceof Error ? e.message : 'Tente novamente.')
        } finally {
            setBaixando(false)
        }
    }

    async function pedirExclusao() {
        setConfirmarExclusao(false)
        try {
            const r = await httpPost('lgpd/excluir-conta', { motivo })
            if (r?.statusCode >= 400) throw new Error(r.message)
            setPedidoFeito(true)
            success('Pedido registrado', 'A barbearia tem até 15 dias para responder.')
        } catch (e) {
            toastErro('Erro ao solicitar', e instanceof Error ? e.message : 'Tente novamente.')
        }
    }

    const cookies = lerConsentimento()

    return (
        <div className="flex min-h-screen flex-col bg-zinc-900">
            <Cabecalho
                titulo="Meus dados"
                descricao="Veja, baixe ou peça a exclusão dos seus dados pessoais."
            />
            <div className="container mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:px-0">
                {/* Quem responde pelos dados */}
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <ShieldCheck size={20} />
                        <h2 className="font-bold">Quem responde pelos seus dados</h2>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        {usuario?.tipo === 'tenant' ? (
                            <>
                                O Barbearia Brutal é o controlador dos dados de cadastro da sua
                                barbearia. Já os dados dos <strong className="text-zinc-300">seus clientes</strong> são
                                seus: você é a controladora deles e o sistema atua como operador,
                                tratando esses dados por sua conta e ordem.
                            </>
                        ) : (
                            <>
                                A barbearia onde você se cadastrou é a controladora dos seus dados. O
                                Barbearia Brutal é o operador: guarda e processa esses dados por conta
                                e ordem dela. Dúvidas sobre a finalidade do tratamento devem ir para a
                                barbearia; sobre a segurança do sistema, para nós.
                            </>
                        )}{' '}
                        Detalhes na{' '}
                        <Link href="/privacy" className="text-yellow-400 underline underline-offset-2">
                            Política de Privacidade
                        </Link>
                        .
                    </p>
                </section>

                {/* Portabilidade */}
                <section>
                    <h2 className="mb-1 text-lg font-bold text-white">Baixar meus dados</h2>
                    <p className="mb-3 text-sm text-zinc-500">
                        Um arquivo com tudo que guardamos sobre você: cadastro, agendamentos,
                        assinaturas e consentimentos. Sem senha — ela é guardada cifrada e nem nós
                        conseguimos ler.
                    </p>
                    <button
                        onClick={baixarDados}
                        disabled={baixando}
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-yellow-300 disabled:opacity-60"
                    >
                        <Download size={16} />
                        {baixando ? 'Preparando...' : 'Baixar em JSON'}
                    </button>
                </section>

                {/* Consentimentos */}
                <section>
                    <h2 className="mb-1 text-lg font-bold text-white">O que eu consenti</h2>
                    <p className="mb-3 text-sm text-zinc-500">
                        Cada escolha fica registrada com a data e a versão do texto aceito.
                    </p>

                    {cookies && (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                            <div className="min-w-0 text-sm">
                                <p className="font-semibold text-white">Cookies neste navegador</p>
                                <p className="text-zinc-500">
                                    Análise: {cookies.analise ? 'aceito' : 'recusado'} · Marketing:{' '}
                                    {cookies.marketing ? 'aceito' : 'recusado'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    limparConsentimento()
                                    success('Escolha apagada', 'O aviso de cookies vai aparecer de novo.')
                                }}
                                className="shrink-0 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                            >
                                Rever escolha
                            </button>
                        </div>
                    )}

                    {carregando ? (
                        <Skeleton className="h-32 w-full" />
                    ) : consentimentos.length === 0 ? (
                        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
                            Nenhum consentimento registrado ainda.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {consentimentos.map((c) => (
                                <li
                                    key={c.id}
                                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                                >
                                    <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                            c.aceito
                                                ? 'bg-green-500/10 text-green-400'
                                                : 'bg-zinc-800 text-zinc-500'
                                        }`}
                                    >
                                        {c.aceito ? <Check size={16} /> : <X size={16} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {ROTULO[c.tipo] ?? c.tipo}
                                        </p>
                                        <p className="truncate text-xs text-zinc-500">
                                            {c.aceito ? 'Aceito' : 'Recusado'} em{' '}
                                            {new Date(c.createdAt).toLocaleString('pt-BR')} · versão {c.versao}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Exclusão */}
                <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="flex items-center gap-2 text-red-400">
                        <Trash2 size={20} />
                        <h2 className="font-bold">Excluir minha conta</h2>
                    </div>
                    {pedidoFeito ? (
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                            Seu pedido foi registrado. O controlador tem até 15 dias para responder.
                            Enquanto isso sua conta continua funcionando normalmente.
                        </p>
                    ) : (
                        <>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                Seus dados pessoais serão anonimizados. O histórico de atendimento
                                permanece sem identificação, porque a barbearia tem obrigação legal de
                                guardar registro dos serviços prestados — é o que a própria LGPD prevê
                                no art. 16. Depois disso não dá para voltar atrás.
                            </p>
                            <textarea
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={2}
                                placeholder="Motivo (opcional)"
                                className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                            />
                            <button
                                onClick={() => setConfirmarExclusao(true)}
                                className="mt-3 rounded-xl border border-red-500/40 px-5 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                Solicitar exclusão
                            </button>
                        </>
                    )}
                </section>
            </div>

            <ConfirmModal
                aberto={confirmarExclusao}
                titulo="Solicitar exclusão da conta"
                mensagem="Seus dados pessoais serão anonimizados e você perde o acesso. Essa ação não pode ser desfeita. Confirma?"
                textoConfirmar="Solicitar exclusão"
                variante="danger"
                onConfirmar={pedirExclusao}
                onCancelar={() => setConfirmarExclusao(false)}
            />
        </div>
    )
}
