import { TelefoneUtils } from '@barba/core'
import { StyleSheet, Text, TextInput, Pressable, View, ImageBackground, Image, Alert } from 'react-native'
import useUsuario from '../data/hooks/useUsuario'
import React, { useContext, useEffect, useState } from 'react'
import useFormUsuarioLogin from '../data/hooks/useFormUsuarioLogin'
import { Ionicons } from '@expo/vector-icons'
import ContextoUsuario from '../data/contexts/ContextoUsuario'
import { useNavigation } from '@react-navigation/native'
import AuthContext from '../data/contexts/UserContext'

export default function Login() {
    const { usuario } = useUsuario()
    const { email, setEmail, senha, setSenha, errors, logar } = useFormUsuarioLogin()
    const [loading, setLoading] = useState(false);

    const { loginUser } = useContext(AuthContext)
    const navigation = useNavigation()

    const [mostrarSenha, setMostrarSenha] = useState(false)

    const handleLogin = async () => {
        setLoading(true);
        try {
            const success = await loginUser(email, senha); // Usa email e senha do estado
            if (success) {
                navigation.navigate('Principal');
            } else {
                Alert.alert('Erro de login', 'Credenciais inválidas.');
            }
        } catch (error) {
            Alert.alert('Erro de login', 'Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };
    

    const toggleMostrarSenha = () => {
        setMostrarSenha(prevState => !prevState)
    }

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/inicio/fundo.png')}
                style={styles.imagemDeFundo}
            >
                <View style={styles.conteudo}>
                    <Image
                        source={require('../../assets/inicio/logo-brutal.png')}
                        style={styles.logo}
                    />
                    <Text style={styles.titulo}>🤘 DO CLASSICO AO ROCK 🤘</Text>
                    <Text style={styles.descricao}>
                        Cabelo afiado, barba de lenhador e mãos de motoqueiro, tudo ao som de rock
                        pesado!
                    </Text>
                    <View style={styles.formulario}>
                        <Text style={styles.label}>E-mail</Text>
                        <TextInput
                            style={[styles.input, errors.email ? styles.inputError : null]}
                            placeholder="Digite seu e-mail"
                            placeholderTextColor="#666"
                            value={email.toLowerCase()}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                        />
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                        <Text style={styles.label}>Senha</Text>
                        <View style={styles.senhaContainer}>
                            <TextInput
                                style={[styles.input, errors.senha ? styles.inputError : null]}
                                placeholder="Digite sua Senha"
                                placeholderTextColor="#666"
                                value={senha}
                                onChangeText={setSenha}
                                secureTextEntry={!mostrarSenha}
                            />
                            <Pressable onPress={toggleMostrarSenha} style={styles.iconContainer}>
                                <Ionicons
                                    name={mostrarSenha ? 'eye-off' : 'eye'}
                                    size={24}
                                    color="white"
                                />
                            </Pressable>
                        </View>
                        {errors.senha ? <Text style={styles.errorText}>{errors.senha}</Text> : null}
                    </View>
                    <Pressable style={styles.button} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Entrar</Text>
                    </Pressable>
                </View>
            </ImageBackground>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    label: {
        color: '#fff',
        alignSelf: 'flex-start',
        marginBottom: 8,
        marginLeft: 10,
        fontSize: 16,
    },
    input: {
        width: '100%',
        minWidth: 280,
        height: 40,
        backgroundColor: '#1e1e1e',
        borderRadius: 5,
        paddingHorizontal: 10,
        color: '#fff',
        marginBottom: 20,
    },
    inputError: {
        borderColor: 'red',
        borderWidth: 1,
    },
    errorText: {
        color: 'red',
        marginBottom: 20,
        marginLeft: 10,
        alignSelf: 'flex-start',
    },
    button: {
        width: '40%',
        height: 40,
        backgroundColor: '#22c55e',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    imagemDeFundo: {
        flex: 1,
        resizeMode: 'cover',
        justifyContent: 'center',
    },
    formulario: {
        padding: 40,
    },
    logo: {
        marginTop: 20,
        marginBottom: 20,
    },
    conteudo: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    titulo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    descricao: {
        fontSize: 14,
        color: 'white',
        textAlign: 'center',
        marginBottom: 20,
        marginHorizontal: 20,
    },
    senhaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconContainer: {
        position: 'absolute',
        right: 10,
        top: 10,
    },
})
