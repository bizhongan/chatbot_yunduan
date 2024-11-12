'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 检查用户登录状态
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // 如果已登录，跳转到聊天页面
        router.push('/chat')
      } else {
        // 如果未登录，跳转到登录页面
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  // 返回空内容，因为会立即重定向
  return null
} 