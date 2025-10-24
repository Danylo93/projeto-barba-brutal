import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native'
import { useApi } from '../data/hooks/useApi'
import { useNavigation } from '@react-navigation/native'

interface Tenant {
  id: number
  nome: string
  email: string
  telefone: string
  endereco?: string
  ativo: boolean
}

export default function SelecionarTenant() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const { get } = useApi()
  const navigation = useNavigation()

  useEffect(() => {
    carregarTenants()
  }, [])

  const carregarTenants = async () => {
    try {
      setLoading(true)
      const response = await get('/tenants')
      setTenants(response.tenants || [])
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os tenants')
      console.error('Erro ao carregar tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtrarTenants = () => {
    if (!searchText) return tenants
    
    return tenants.filter(tenant => 
      tenant.nome.toLowerCase().includes(searchText.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchText.toLowerCase())
    )
  }

  const selecionarTenant = (tenant: Tenant) => {
    if (!tenant.ativo) {
      Alert.alert('Tenant Inativo', 'Este tenant está inativo. Entre em contato com o suporte.')
      return
    }

    // Aqui você pode salvar o tenant selecionado e prosseguir para o login
    navigation.navigate('Login', { tenantId: tenant.id, tenantNome: tenant.nome })
  }

  const renderTenant = ({ item }: { item: Tenant }) => (
    <TouchableOpacity
      style={[styles.tenantCard, !item.ativo && styles.tenantCardInativo]}
      onPress={() => selecionarTenant(item)}
      disabled={!item.ativo}
    >
      <View style={styles.tenantInfo}>
        <Text style={[styles.tenantNome, !item.ativo && styles.tenantNomeInativo]}>
          {item.nome}
        </Text>
        <Text style={styles.tenantEmail}>{item.email}</Text>
        <Text style={styles.tenantTelefone}>{item.telefone}</Text>
        {item.endereco && (
          <Text style={styles.tenantEndereco}>{item.endereco}</Text>
        )}
      </View>
      <View style={styles.tenantStatus}>
        <View style={[
          styles.statusBadge,
          item.ativo ? styles.statusAtivo : styles.statusInativo
        ]}>
          <Text style={[
            styles.statusText,
            item.ativo ? styles.statusTextAtivo : styles.statusTextInativo
          ]}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando tenants...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Selecionar Barbearia</Text>
        <Text style={styles.subtitle}>Escolha a barbearia que você deseja acessar</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar barbearia..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filtrarTenants()}
        renderItem={renderTenant}
        keyExtractor={(item) => item.id.toString()}
        style={styles.tenantList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tenantList: {
    flex: 1,
  },
  tenantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tenantCardInativo: {
    opacity: 0.6,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tenantNomeInativo: {
    color: '#999',
  },
  tenantEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  tenantTelefone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  tenantEndereco: {
    fontSize: 12,
    color: '#999',
  },
  tenantStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAtivo: {
    backgroundColor: '#d4edda',
  },
  statusInativo: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusTextAtivo: {
    color: '#155724',
  },
  statusTextInativo: {
    color: '#721c24',
  },
})
