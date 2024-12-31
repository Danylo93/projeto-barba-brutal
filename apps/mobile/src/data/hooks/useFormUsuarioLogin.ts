import { useState } from "react"
import useUsuario from "./useUsuario"

export default function useFormUsuarioLogin() {
    const { entrar } = useUsuario()

    const [email, setEmail] = useState('')
   
    const [senha, setSenha] = useState('')

    const [errors, setErrors] = useState({ email: '', senha: '' })

    function validate() {
        let errors: any = {}

        
        if (!email) {
            errors.email = 'E-mail é obrigatório'
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'E-mail inválido'
        }
        else if (!senha) {
           errors.senha = 'Senha é obrigatória'
        }
       
        setErrors(errors)
        return Object.keys(errors).length === 0
    }

    async function logar() {
        if (validate()) {
            await entrar({
                email, senha
            })
        }
    }

    return {
        email,
        setEmail,
        senha,
        setSenha,
        errors,
        logar,
    }
}