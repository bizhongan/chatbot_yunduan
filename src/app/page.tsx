'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './Home.module.css'

export default function Home() {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // 页面加载时显示弹窗
    setShowModal(true)

    // 3秒后自动关闭弹窗
    const timer = setTimeout(() => {
      setShowModal(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={styles.container}>
      {/* 主标题 */}
      <h1 className={styles.title}>
        欢迎来到云端的AI智能会话
      </h1>

      {/* 副标题 */}
      <p className={styles.subtitle}>
        体验智能对话的未来
      </p>

      {/* 入口按钮 */}
      <Link 
        href="/chat" 
        className={styles.button}>
        开始对话
      </Link>

      {/* 欢迎弹窗 */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <p>你今天已经很棒啦！</p>
          </div>
        </div>
      )}
    </div>
  )
} 