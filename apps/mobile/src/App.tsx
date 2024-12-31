import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text, View } from 'react-native'
import { ProvedorUsuario } from './data/contexts/ContextoUsuario'
import { ProvedorAgendamento } from './data/contexts/ContextoAgendamento'
import { NavigationContainer } from '@react-navigation/native'
import Cadastro from './screens/Cadastro'
import Principal from './screens/Principal'
import Sumario from './screens/Sumario'
import Login from './screens/Login'
import { ProvedorSessao } from './data/contexts/ContextoSessao'
import { AuthProvider } from './data/contexts/UserContext'

const Stack = createNativeStackNavigator()

export default function App() {
    return (
        <AuthProvider>
        
            <ProvedorAgendamento>
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen
                            name="Login"
                            component={Login}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="Cadastro"
                            component={Cadastro}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="Principal"
                            component={Principal}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="Sumario"
                            component={Sumario}
                            options={{
                                headerShown: false,
                            }}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </ProvedorAgendamento>
        </AuthProvider>
    )
}
