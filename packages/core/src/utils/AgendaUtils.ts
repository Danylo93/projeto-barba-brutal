export default class AgendaUtils {
    private static minutos = [0, 15, 30, 45]

    static horariosDoDia() {
        return {
            manha: this.gerarHorarios([8, 9, 10, 11]),
            tarde: this.gerarHorarios([14, 15, 16, 17]),
            noite: this.gerarHorarios([18, 19, 20, 21]),
        }
    }

    static duracaoTotal(servicos: { qtdeSlots: number }[]) {
        const duracao = servicos.reduce((acc, atual) => {
            return (acc += atual.qtdeSlots * 15)
        }, 0)

        return `${Math.trunc(duracao / 60)}h ${duracao % 60}m`
    }

    private static gerarHorarios(horas: number[]) {
        return horas.reduce((horarios, hora) => {
            const todos = this.minutos.map((minuto) => {
                return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
            })
            return horarios.concat(todos)
        }, [] as string[])
    }
}
