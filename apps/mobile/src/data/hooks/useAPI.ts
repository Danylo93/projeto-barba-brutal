import { useContext } from 'react'
import ContextoUsuario from '../contexts/ContextoUsuario'

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export function useApi() {
  const { token, tenant } = useContext(ContextoUsuario)

  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (tenant) {
      headers['X-Tenant-ID'] = tenant.id.toString()
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro na requisição')
    }

    return response.json()
  }

  const get = (endpoint: string) => makeRequest(endpoint, { method: 'GET' })
  const post = (endpoint: string, data?: any) => 
    makeRequest(endpoint, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    })
  const put = (endpoint: string, data?: any) => 
    makeRequest(endpoint, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    })
  const del = (endpoint: string) => makeRequest(endpoint, { method: 'DELETE' })

  return {
    get,
    post,
    put,
    delete: del,
    makeRequest,
  }
}