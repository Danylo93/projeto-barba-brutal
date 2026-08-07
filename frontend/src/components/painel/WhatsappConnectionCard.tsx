'use client'

import { useEffect, useState } from 'react'
import {
    CheckCircle2,
    CircleAlert,
    Copy,
    Loader2,
    QrCode,
    RefreshCw,
    Smartphone,
    Webhook,
    WifiOff,
} from 'lucide-react'
import useAPI from '@/data/hooks/useAPI'
import { useToast } from '@/hooks/use-toast'

type StatusConexao =
    | 'sem_instance'
    | 'nao_configurada'
    | 'nao_encontrada'
    | 'conectada'
    | 'desconectada'
    | 'conectando'
    | 'indisponivel'

interface ConexaoWhatsapp {
    status: StatusConexao
    instance: string | null
    evolutionState: string | null
    managerUrl: string | null
    qrCode?: string | null
    pairingCode?: string | null
    mensagem?: string
}

interface WebhookAtendente {
    status: 'configurado' | 'nao_configurado' | 'indisponivel'
    instance: string | null
    mensagem: string
}

/**
 * A instance não é editável aqui de propósito.
 *
 * Quem cria a instance no servidor da Evolution é o admin do SaaS — o dono da
 * barbearia não teria como inventar um nome que existisse. Quando o campo era
 * dele, só dava para digitar um nome que nunca conecta ou o de outra
 * barbearia. Aqui ele vê o nome que recebeu e se o número está no ar.
 */
interface WhatsappConnectionCardProps {
    refreshKey: number
}

const visualDoStatus: Record<StatusConexao, { texto: string; classe: string }> = {
    sem_instance: { texto: 'Não configurada', classe: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
    nao_configurada: { texto: 'Servidor pendente', classe: 'border-red-400/30 bg-red-400/10 text-red-300' },
    nao_encontrada: { texto: 'Instance não encontrada', classe: 'border-red-400/30 bg-red-400/10 text-red-300' },
    conectada: { texto: 'WhatsApp conectado', classe: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
    desconectada: { texto: 'Aguardando conexão', classe: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
    conectando: { texto: 'Leia o QR Code', classe: 'border-sky-400/30 bg-sky-400/10 text-sky-300' },
    indisponivel: { texto: 'Evolution indisponível', classe: 'border-red-400/30 bg-red-400/10 text-red-300' },
}

export default function WhatsappConnectionCard({
    refreshKey,
}: WhatsappConnectionCardProps) {
    const { httpGet, httpPost } = useAPI()
    const { success: toastSuccess, error: toastError } = useToast()
    const [conexao, setConexao] = useState<ConexaoWhatsapp | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingQr, setLoadingQr] = useState(false)
    const [loadingWebhook, setLoadingWebhook] = useState(false)
    const [webhook, setWebhook] = useState<WebhookAtendente | null>(null)
    const [erro, setErro] = useState('')

    async function configurarWebhook(mostrarToast = true) {
        try {
            setLoadingWebhook(true)
            const data: WebhookAtendente = await httpPost('tenants/me/whatsapp/webhook', {})
            setWebhook(data)
            if (mostrarToast && data.status === 'configurado') {
                toastSuccess('Atendente ativado', 'A Evolution já está enviando novas mensagens ao n8n.')
            }
            if (mostrarToast && data.status !== 'configurado') {
                toastError('Webhook pendente', data.mensagem)
            }
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível ativar o webhook.'
            setWebhook({ status: 'indisponivel', instance: conexao?.instance ?? null, mensagem })
            if (mostrarToast) toastError('Webhook pendente', mensagem)
        } finally {
            setLoadingWebhook(false)
        }
    }

    async function gerarQrCode() {
        try {
            setLoadingQr(true)
            setErro('')
            const data = await httpPost('tenants/me/whatsapp/qrcode', {})
            setConexao(data)
            if (data?.status === 'conectada') await configurarWebhook(false)
            if (!data?.qrCode && data?.mensagem) setErro(data.mensagem)
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível gerar o QR Code.'
            setErro(mensagem)
            toastError('QR Code indisponível', mensagem)
        } finally {
            setLoadingQr(false)
        }
    }

    async function carregarConexao(gerarQr = false) {
        try {
            setLoading(true)
            setErro('')
            const data: ConexaoWhatsapp = await httpGet('tenants/me/whatsapp')
            setConexao((anterior) => ({
                ...data,
                qrCode: data.status === 'conectada' ? null : anterior?.qrCode,
            }))
            if (data.status === 'conectada') await configurarWebhook(false)
            if (gerarQr && (data.status === 'desconectada' || data.status === 'conectando')) {
                await gerarQrCode()
            }
        } catch (error) {
            const mensagem = error instanceof Error ? error.message : 'Não foi possível consultar o WhatsApp.'
            setErro(mensagem)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void carregarConexao(true)
        // O componente só monta na aba de integrações; refreshKey muda após salvar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey])

    useEffect(() => {
        if (!conexao?.qrCode) return

        const intervalo = window.setInterval(async () => {
            try {
                const data: ConexaoWhatsapp = await httpGet('tenants/me/whatsapp')
                setConexao((anterior) => ({
                    ...data,
                    qrCode: data.status === 'conectada' ? null : anterior?.qrCode,
                }))
                if (data.status === 'conectada') {
                    const webhookData: WebhookAtendente = await httpPost('tenants/me/whatsapp/webhook', {})
                    setWebhook(webhookData)
                    toastSuccess('WhatsApp conectado', 'A barbearia já pode receber mensagens pelo atendente.')
                }
            } catch {
                // Uma oscilação no polling não deve apagar um QR que ainda pode ser lido.
            }
        }, 6_000)

        return () => window.clearInterval(intervalo)
    }, [conexao?.qrCode, httpGet, httpPost, toastSuccess])

    async function copiar(valor: string, descricao: string) {
        await navigator.clipboard.writeText(valor)
        toastSuccess('Copiado', descricao)
    }

    const status = conexao?.status ?? 'sem_instance'
    const visual = visualDoStatus[status]
    const instance = conexao?.instance ?? ''
    const precisaCriar = status === 'sem_instance' || status === 'nao_encontrada'

    return (
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 shadow-2xl shadow-black/20">
            <div className="relative border-b border-zinc-800 px-6 py-6 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_45%)]" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
                            <Smartphone size={25} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/80">Canal de atendimento</p>
                            <h2 className="mt-1 text-xl font-black text-white">WhatsApp da barbearia</h2>
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
                                Cada barbearia usa uma instance própria. A chave da Evolution permanece protegida no servidor do SaaS.
                            </p>
                        </div>
                    </div>
                    <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${visual.classe}`}>
                        {loading ? 'Consultando...' : visual.texto}
                    </span>
                </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
                <div>
                    <p className="mb-2 text-sm font-semibold text-zinc-200">Instance desta barbearia</p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <p className="min-w-0 flex-1 truncate rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 font-mono text-sm text-zinc-300">
                            {instance || <span className="font-sans text-zinc-500">Ainda não vinculada</span>}
                        </p>
                        <button
                            type="button"
                            onClick={() => void carregarConexao(false)}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
                        >
                            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                            Atualizar status
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                        Quem cria e vincula a instance é o time do Barbearia Brutal. Você conecta o número lendo o QR Code.
                    </p>
                </div>

                {loading && !conexao && (
                    <div className="flex min-h-44 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40">
                        <Loader2 className="animate-spin text-emerald-300" size={28} />
                    </div>
                )}

                {!loading && precisaCriar && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6">
                        <div className="flex items-center gap-3 text-amber-200">
                            <CircleAlert size={21} />
                            <h3 className="font-black">Canal ainda não liberado</h3>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                            O atendimento por WhatsApp precisa de um canal exclusivo desta barbearia — é ele que
                            impede que as conversas e as agendas de barbearias diferentes se misturem. Nossa
                            equipe prepara isso para você; assim que estiver pronto, o QR Code aparece aqui e
                            você conecta o número em um minuto.
                        </p>
                        <p className="mt-4 text-sm font-bold text-amber-100">
                            Fale com o suporte do Barbearia Brutal para liberar.
                        </p>
                    </div>
                )}

                {!loading && status === 'conectada' && (
                    <div className="space-y-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="w-fit rounded-full bg-emerald-400/15 p-3 text-emerald-300">
                                <CheckCircle2 size={30} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-emerald-100">Conexão pronta</h3>
                                <p className="mt-1 text-sm text-zinc-400">
                                    O número vinculado à instance <span className="font-mono text-zinc-200">{conexao?.instance}</span> está online.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-emerald-400/15 pt-5 sm:flex-row sm:items-center">
                            <div className={`w-fit rounded-xl p-2.5 ${webhook?.status === 'configurado' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
                                {loadingWebhook ? <Loader2 className="animate-spin" size={20} /> : <Webhook size={20} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-zinc-100">
                                    {loadingWebhook
                                        ? 'Ativando entrega de mensagens...'
                                        : webhook?.status === 'configurado'
                                            ? 'Webhook do atendente ativo'
                                            : 'Webhook do atendente pendente'}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                                    {webhook?.mensagem ?? 'Conferindo o evento MESSAGES_UPSERT e a autenticação do n8n.'}
                                </p>
                            </div>
                            {!loadingWebhook && webhook?.status !== 'configurado' && (
                                <button
                                    type="button"
                                    onClick={() => void configurarWebhook(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-amber-200"
                                >
                                    <RefreshCw size={16} /> Ativar webhook
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {!loading && (status === 'desconectada' || status === 'conectando') && (
                    <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-center">
                        <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-zinc-700 bg-white p-4 shadow-[0_0_40px_rgba(34,197,94,0.12)]">
                            {loadingQr ? (
                                <Loader2 className="animate-spin text-zinc-900" size={34} />
                            ) : conexao?.qrCode ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={conexao.qrCode} alt="QR Code para conectar o WhatsApp" className="h-full w-full object-contain" />
                            ) : (
                                <div className="text-center text-zinc-800">
                                    <QrCode className="mx-auto" size={58} />
                                    <p className="mt-3 text-sm font-bold">QR ainda não disponível</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Conectar aparelho</p>
                            <h3 className="mt-2 text-2xl font-black text-white">Leia o QR pelo WhatsApp</h3>
                            <ol className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-400">
                                <li><span className="font-bold text-zinc-200">1.</span> Abra o WhatsApp no celular da barbearia.</li>
                                <li><span className="font-bold text-zinc-200">2.</span> Entre em Aparelhos conectados e escolha Conectar um aparelho.</li>
                                <li><span className="font-bold text-zinc-200">3.</span> Aponte a câmera para este código. O painel reconhecerá a conexão automaticamente.</li>
                            </ol>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => void gerarQrCode()}
                                    disabled={loadingQr}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50"
                                >
                                    {loadingQr ? <Loader2 className="animate-spin" size={17} /> : <QrCode size={17} />}
                                    Gerar novo QR
                                </button>
                                {conexao?.pairingCode && (
                                    <button
                                        type="button"
                                        onClick={() => void copiar(conexao.pairingCode!, 'Código de pareamento copiado.')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:border-zinc-500"
                                    >
                                        <Copy size={16} /> Copiar código
                                    </button>
                                )}
                            </div>
                            {erro && <p className="mt-3 text-sm text-red-300">{erro}</p>}
                        </div>
                    </div>
                )}

                {!loading && (status === 'nao_configurada' || status === 'indisponivel') && (
                    <div className="flex gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-5">
                        <WifiOff className="shrink-0 text-red-300" size={24} />
                        <div>
                            <h3 className="font-black text-red-100">A Evolution precisa de atenção</h3>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                                {conexao?.mensagem ?? erro ?? 'Não foi possível consultar o servidor da Evolution.'}
                            </p>
                            {status === 'nao_configurada' && (
                                <p className="mt-2 text-xs text-zinc-500">Configure EVOLUTION_URL e EVOLUTION_APIKEY no backend do SaaS.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
