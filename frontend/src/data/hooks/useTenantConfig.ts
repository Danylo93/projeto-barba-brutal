import { useState, useEffect } from 'react'
import useUsuario from './useUsuario'
import useAPI from './useAPI'

export default function useTenantConfig() {
    const { usuario } = useUsuario()
    const { httpGet } = useAPI()
    const [configuracoes, setConfiguracoes] = useState<any>(null)

    useEffect(() => {
        if (!usuario?.tenantId) return
        httpGet(`tenants/${usuario.tenantId}`).then(tenant => {
            if (tenant?.configuracoes) {
                setConfiguracoes(tenant.configuracoes)
            }
        }).catch(() => {})
    }, [usuario?.tenantId, httpGet])

    return configuracoes
}
