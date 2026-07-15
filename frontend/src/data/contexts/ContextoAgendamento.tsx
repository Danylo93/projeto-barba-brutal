import { createContext, useCallback, useEffect, useState } from 'react'
import { AgendaUtils, Profissional, Servico, DataUtils } from '@/lib/agendamento-utils'
import useUsuario from '../hooks/useUsuario'
import useAPI from '../hooks/useAPI'

interface ContextoAgendamentoProps {
    profissional: Profissional | null
    servicos: Servico[]
    data: Date
    horariosOcupados: string[]
    duracaoTotal(): string
    precoTotal(): number
    quantidadeDeSlots(): number
    selecionarProfissional(profissional: Profissional): void
    selecionarServicos(servicos: Servico[]): void
    selecionarData(data: Date): void
    agendar(): Promise<void>
    configuracoes: any
}

export const ContextoAgendamento = createContext({} as ContextoAgendamentoProps)

export function ProvedorAgendamento({ children }: { children: React.ReactNode }) {
    const [profissional, setProfissional] = useState<Profissional | null>(null)
    const [servicos, setServicos] = useState<Servico[]>([])
    const [data, setData] = useState<Date>(DataUtils.hoje())

    const { usuario } = useUsuario()
    const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
    const [configuracoes, setConfiguracoes] = useState<any>(null)
    const { httpGet, httpPost } = useAPI()

    useEffect(() => {
        if (!usuario?.tenantId) return
        httpGet(`tenants/${usuario.tenantId}`).then(tenant => {
            if (tenant?.configuracoes) {
                setConfiguracoes(tenant.configuracoes)
            }
        }).catch(() => {})
    }, [usuario?.tenantId, httpGet])

    function selecionarProfissional(profissional: Profissional) {
        setProfissional(profissional)
    }

    function selecionarServicos(servicos: Servico[]) {
        setServicos(servicos)
    }

    function duracaoTotal() {
        return AgendaUtils.duracaoTotal(servicos)
    }

    function precoTotal() {
        return servicos.reduce((acc, atual) => {
            return (acc += atual.preco)
        }, 0)
    }

    const selecionarData = useCallback(function (hora: Date) {
        setData(hora)
    }, [])

    function quantidadeDeSlots() {
        const totalDeSlots = servicos.reduce((acc, servico) => {
            return acc + (servico.qtdeSlots ?? 1)
        }, 0)

        return totalDeSlots
    }

    async function agendar() {
        if (!usuario?.id || !profissional || servicos.length === 0) {
            throw new Error('Selecione profissional, serviços e horário antes de finalizar.')
        }

        if (data.getTime() < Date.now()) {
            throw new Error('Escolha um horário futuro para o agendamento.')
        }

        // O backend espera IDs (não os objetos completos) e valida usuarioId contra o token.
        const resposta = await httpPost('agendamentos', {
            usuarioId: usuario.id,
            profissionalId: profissional.id,
            servicos: servicos.map((s) => s.id),
            data: data!,
        })

        // httpPost devolve o corpo mesmo em erro; detectar falha do backend.
        if (resposta && (resposta.statusCode >= 400 || resposta.message)) {
            throw new Error(resposta.message || 'Não foi possível concluir o agendamento.')
        }

        limpar()
    }

    function limpar() {
        setData(DataUtils.hoje())
        setHorariosOcupados([])
        setProfissional(null)
        setServicos([])
    }

    const obterHorariosOcupados = useCallback(
        async function (data: Date, profissional: Profissional): Promise<string[]> {
            try {
                if (!data || !profissional) return []
                const dtString = data.toISOString().slice(0, 10)
                const ocupacao = await httpGet(
                    `agendamentos/ocupacao/${profissional!.id}/${dtString}`
                )
                return ocupacao ?? []
            } catch (e) {
                return []
            }
        },
        [httpGet]
    )

    useEffect(() => {
        if (!data || !profissional) return
        obterHorariosOcupados(data, profissional).then(setHorariosOcupados)
    }, [data, profissional, obterHorariosOcupados])

    return (
        <ContextoAgendamento.Provider
            value={{
                data,
                profissional,
                servicos,
                horariosOcupados,
                duracaoTotal,
                precoTotal,
                selecionarData,
                selecionarProfissional,
                quantidadeDeSlots,
                selecionarServicos,
                agendar,
                configuracoes,
            }}
        >
            {children}
        </ContextoAgendamento.Provider>
    )
}
