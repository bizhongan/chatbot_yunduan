'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ChatInput from '@/components/ChatInput'
import styles from './Chat.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [partialResponse, setPartialResponse] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 复制整个消息内容
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 停止生成回答
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      if (partialResponse) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: partialResponse
        }])
        setPartialResponse("")
      }
    }
  }

  const formatMessage = (content: string) => {
    return (
      <div className={styles.messageContent}>
        <div className={styles.messageActions}>
          <button
            onClick={() => handleCopy(content)}
            className={styles.copyButton}
          >
            复制全部
          </button>
        </div>
        {content.split(/```([\s\S]*?)```/).map((part, index) => {
          if (index % 2 === 0) {
            return <p key={index} className="whitespace-pre-wrap leading-relaxed">{part}</p>
          } else {
            return (
              <pre key={index}>
                <button 
                  onClick={() => handleCopy(part.trim())}
                  className={styles.codeCopyButton}
                >
                  复制代码
                </button>
                <code>{part.trim()}</code>
              </pre>
            )
          }
        })}
      </div>
    )
  }

  const handleSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return

    try {
      setIsLoading(true)
      const userMessage: Message = { role: 'user', content: message }
      const newMessages = [...messages, userMessage]
      setMessages(newMessages)
      setPartialResponse("")

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) throw new Error('API 请求失败')
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('无法读取响应')

      let accumulatedResponse = ""
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        accumulatedResponse += chunk
        setPartialResponse(accumulatedResponse)
      }

      setMessages([...newMessages, {
        role: 'assistant',
        content: accumulatedResponse
      }])
      setPartialResponse("")

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('回答生成已停止')
      } else {
        console.error('API 调用错误:', error)
        setMessages([...messages, {
          role: 'assistant',
          content: '抱歉，发生了一些错误。请稍后再试。'
        }])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          云端AI助手
        </Link>
        <div className={styles.headerActions}>
          {isLoading && (
            <button 
              onClick={handleStopGeneration}
              className={styles.stopButton}
            >
              停止生成
            </button>
          )}
          <button 
            onClick={() => setMessages([])}
            className={styles.clearButton}
          >
            清空对话
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className={styles.messagesContainer}>
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.welcomeMessage}>
              <div className="text-6xl mb-4">👋</div>
              <p className="text-xl">你好！我是云端小助手</p>
              <p className="text-gray-400 mt-2">让我们开始对话吧！</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    formatMessage(message.content)
                  )}
                </div>
              ))}
              {partialResponse && (
                <div className={styles.partialResponse}>
                  {formatMessage(partialResponse)}
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"></span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className={styles.inputContainer}>
        <ChatInput 
          onSend={handleSubmit} 
          disabled={isLoading}
        />
      </div>
    </div>
  )
}

export default ChatPage