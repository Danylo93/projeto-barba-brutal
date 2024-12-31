import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:3001',
});

const useAPI = () => {
  const httpPost = async (url: string, data: any) => {
    try {
      const response = await apiClient.post(url, data);
      return response; // Certifique-se de retornar a resposta completa
    } catch (error: any) {
      console.error('Erro no POST:', error?.response || error);
      throw error;
    }
  };

  const httpGet = async (url: string) => {
    try {
      const response = await apiClient.get(url);
      return response; // Certifique-se de retornar a resposta completa
    } catch (error: any) {
      console.error('Erro no GET:', error?.response || error);
      throw error;
    }
  };

  return { httpPost, httpGet };
};

export default useAPI;



