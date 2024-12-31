import { useContext } from 'react'
import ContextoSessao from '../contexts/ContextoSessao'

export default function useSessao() {
    const contexto = useContext(ContextoSessao)
    return contexto
}
