import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAPI from  '@/src/data/hooks/useAPI'

interface AuthContextType {
  user: any;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<boolean>;
  createUser: (userData: UserData) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginUser: async () => false,
  createUser: async () => {},
  logoutUser: async () => {},
});

interface UserData {
  email: string;
  password?: string;
  name: string;
  address?: string;
  role: string;
  obreiro?: string;
  discipulador?: string;
  cellName?: string;
  phone?: string;
}

export const AuthProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
    const { httpPost , httpGet} = useAPI()



    const loginUser = async (email: string, password: string): Promise<boolean> => {

      if (!email || !password) {
        console.error("E-mail ou senha não fornecidos.");
        return false;
      }
      try {
        const response = await httpPost('usuario/login', { email, password });
    
        if (!response || !response.data) {
          console.error('Resposta inválida da API no login:', response);
          return false;
        }
    
        const token = response.data.token;
        await AsyncStorage.setItem('token', token);
    
        // Obtém os dados completos do perfil do usuário
        const userResponse = await httpGet('usuario/login');
        if (!userResponse || !userResponse.data) {
          console.error('Resposta inválida da API ao buscar o usuário:', userResponse);
          return false;
        }
    
        const userData = userResponse.data;
        console.log('Dados da API:', userData);
    
        // Salva os dados do usuário no estado e no AsyncStorage
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
    
        return true;
      } catch (error: any) {
        console.error('Erro na API durante o login:', error?.response || error);
        return false;
      }
    };
    

  const createUser = async (userData: UserData) => {
    try {
      const response = await httpPost('usuario/register', userData);
      setUser(response.data);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    } catch (error: any) {
      console.error('User creation failed', error);
      throw new Error(error?.response?.data?.message || 'User creation failed');
    }
  };

  

  const logoutUser = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, createUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
