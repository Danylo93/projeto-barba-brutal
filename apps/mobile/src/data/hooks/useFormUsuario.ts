import { useState } from "react"
import useUsuario from "./useUsuario"

export default function useFormUsuario() {
    const { registrar } = useUsuario()

    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [telefone, setTelefone] = useState('')
    const [senha, setSenha] = useState('')

    const [errors, setErrors] = useState({ nome: '', email: '', telefone: '', senha: '' })

    function validate() {
        let errors: any = {}

        if (!nome) {
            errors.nome = 'Nome é obrigatório'
        }
        if (!email) {
            errors.email = 'E-mail é obrigatório'
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'E-mail inválido'
        }
        else if (!senha) {
           errors.senha = 'Senha é obrigatória'
        }
        if (!telefone) {
            errors.telefone = 'Telefone é obrigatório'
        } else if (!/^\d{10,11}$/.test(telefone)) {
            errors.telefone = 'Telefone deve ter 10 ou 11 dígitos'
        }

        setErrors(errors)
        return Object.keys(errors).length === 0
    }

    async function cadastrar() {
        if (validate()) {
            await registrar({ nome, email, telefone, senha })
        }
    }

    return {
        nome,
        setNome,
        email,
        setEmail,
        senha,
        setSenha,
        telefone,
        setTelefone,
        errors,
        cadastrar,
    }
}