'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth'
import styles from './Login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const googleProvider = new GoogleAuthProvider()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/chat')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('请填写所有字段')
      return
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      router.push('/chat')
    } catch (error: any) {
      console.error('认证错误:', error)
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('该邮箱已被注册')
          break
        case 'auth/invalid-email':
          setError('邮箱格式不正确')
          break
        case 'auth/weak-password':
          setError('密码强度太弱')
          break
        case 'auth/user-not-found':
          setError('用户不存在')
          break
        case 'auth/wrong-password':
          setError('密码错误')
          break
        default:
          setError('登录失败，请稍后重试')
      }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      router.push('/chat')
    } catch (error: any) {
      console.error('Google 登录错误:', error)
      setError('Google 登录失败，请稍后重试')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>欢迎使用云端AI助手</h1>
        {error && <p className={styles.error}>{error}</p>}
        
        <button 
          onClick={handleGoogleLogin}
          className={styles.googleButton}
        >
          使用 Google 账号登录
        </button>

        <div className={styles.divider}>
          <span>或</span>
        </div>

        <form onSubmit={handleEmailAuth} className={styles.form}>
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            {isLogin ? '登录' : '注册'}
          </button>
        </form>

        <p className={styles.toggle}>
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={styles.toggleButton}
          >
            {isLogin ? '注册' : '登录'}
          </button>
        </p>

        <div className={styles.developer}>
          <p>开发者：云端上见你！</p>
        </div>
      </div>
    </div>
  )
} 