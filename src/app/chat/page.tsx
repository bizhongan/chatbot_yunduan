'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ChatInput from '@/components/ChatInput'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [partialResponse, setPartialResponse] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return

    try {
      setIsLoading(true)
      const userMessage: Message = { role: 'user', content: message }
      const newMessages = [...messages, userMessage]
      setMessages(newMessages)
      setPartialResponse("")

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) throw new Error('API 请求失败')
      
      // 处理流式响应
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

    } catch (error) {
      console.error('API 调用错误:', error)
      setMessages([...messages, {
        role: 'assistant',
        content: '抱歉，发生了一些错误。请稍后再试。'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"></div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                DeepSeek Chat
              </span>
            </Link>
            <button 
              onClick={() => setMessages([])}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              清空对话
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">👋</div>
              <p className="text-xl">你好！我是 DeepSeek AI 助手</p>
              <p className="text-gray-400 mt-2">让我们开始对话吧！</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-white/70 backdrop-blur-sm border border-gray-100 shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {partialResponse && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-6 py-4 bg-white/70 backdrop-blur-sm border border-gray-100 shadow-lg">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {partialResponse}
                      <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"></span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-100 bg-white/70 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <ChatInput 
            onSend={handleSubmit} 
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatPage