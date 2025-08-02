import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

interface User {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  role: 'admin' | 'user'
  is_active: boolean
  profile_picture_url?: string;
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  loading: boolean
}

interface RegisterData {
  username: string
  email: string
  password: string
  full_name?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/auth/me')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Token'ı localStorage'dan al ve kullanıcı bilgilerini kontrol et
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    try {
    const response = await api.post(
          '/api/v1/auth/login',
          { email, password },
          { headers: { 'Content-Type': 'application/json' } }
        );
      const { access_token } = response.data
      localStorage.setItem('token', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      

      const userResponse = await api.get('/api/v1/auth/me')
      setUser(userResponse.data)
    } catch (error) {
      throw error
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await api.post('/api/v1/auth/register', userData)
      setUser(response.data)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 