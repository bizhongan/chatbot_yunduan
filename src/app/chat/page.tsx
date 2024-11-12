'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ChatInput from '@/components/ChatInput'
import styles from './Chat.module.css'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { addDoc, collection, query, where, getDocs, deleteDoc, orderBy, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  timestamp: string;
}

const ChatPage: React.FC = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [partialResponse, setPartialResponse] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const router = useRouter()

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
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // 自定义代码块渲染
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              if (!inline && match) {
                return (
                  <pre className={className}>
                    <button 
                      onClick={() => handleCopy(String(children))}
                      className={styles.codeCopyButton}
                    >
                      复制代码
                    </button>
                    <code {...props}>{children}</code>
                  </pre>
                )
              }
              return <code className={className} {...props}>{children}</code>
            },
            // 自定义标题渲染
            h1: ({node, ...props}) => <h1 className={styles.heading1} {...props} />,
            h2: ({node, ...props}) => <h2 className={styles.heading2} {...props} />,
            h3: ({node, ...props}) => <h3 className={styles.heading3} {...props} />,
            // 自定义段落渲染
            p: ({node, ...props}) => <p className={styles.paragraph} {...props} />,
            // 自定义列表渲染
            ul: ({node, ...props}) => <ul className={styles.list} {...props} />,
            li: ({node, ...props}) => <li className={styles.listItem} {...props} />,
            // 自定义引用渲染
            blockquote: ({node, ...props}) => <blockquote className={styles.blockquote} {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
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

  // 修改保存聊天记录的函数
  const saveChatHistory = async () => {
    if (!user || messages.length === 0) return;
    
    try {
      // 使用第一条消息的前20个字符作为标题
      const title = messages[0].content.slice(0, 20) + '...';
      
      await addDoc(collection(db, 'chatHistories'), {
        userId: user.uid,
        title,
        messages,
        timestamp: new Date().toISOString()
      });
      
      // 保存后立即重新加载历史记录
      await loadChatHistories();
    } catch (error) {
      console.error('保存聊天历史失败:', error);
    }
  };

  // 添加页面刷新前的保存逻辑
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (messages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        await saveChatHistory();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages]);

  // 在页面加载时检查是否有未保存的对话
  useEffect(() => {
    const savedChat = localStorage.getItem('currentChat');
    if (savedChat) {
      const { messages: savedMessages, timestamp } = JSON.parse(savedChat);
      // 如果有未保存的对话，先恢复它
      setMessages(savedMessages);
      
      // 然后异步保存到 Firestore
      const saveToFirestore = async () => {
        await saveChatHistory();
        // 保存成功后清除 localStorage
        localStorage.removeItem('currentChat');
        // 重新加载聊天历史
        loadChatHistories();
      };
      
      saveToFirestore();
    }
  }, []);

  // 加载聊天历史列表
  const loadChatHistories = async () => {
    if (!user) return;
    
    try {
      const chatRef = collection(db, 'chatHistories');
      const q = query(
        chatRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const histories: ChatHistory[] = [];
      
      querySnapshot.forEach((doc) => {
        histories.push({
          id: doc.id,
          ...doc.data()
        } as ChatHistory);
      });
      
      setChatHistories(histories);
    } catch (error) {
      console.error('加载聊天历史���败:', error);
    }
  };

  // 加载特定的聊天记录
  const loadChatHistory = (history: ChatHistory) => {
    setMessages(history.messages);
    setSelectedChatId(history.id);
    // 更新 URL，但不重新加载页面
    window.history.pushState({}, '', `/chat/${history.id}`);
  };

  // 在组件加载时获取聊天历史
  useEffect(() => {
    if (user) {
      loadChatHistories();
    }
  }, [user]);

  // 修改退出登录函数
  const handleSignOut = async () => {
    try {
      // 如果有当前对话，先保存
      if (messages.length > 0) {
        await saveChatHistory();
      }
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  // 添加删除所有聊天记录的函数
  const deleteAllChatHistories = async () => {
    if (!user) return;
    
    const confirmed = window.confirm('确定要删除所有聊天记录吗？此操作不可恢复。');
    if (!confirmed) return;
    
    try {
      const chatRef = collection(db, 'chatHistories');
      const q = query(chatRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      setChatHistories([]);
      setMessages([]);
      setSelectedChatId(null);
    } catch (error) {
      console.error('删除聊天记录失败:', error);
    }
  };

  // 添加存档功能
  const handleArchive = async () => {
    if (messages.length === 0) return;
    
    try {
      await saveChatHistory();
      // 清空当前对话
      setMessages([]);
      setSelectedChatId(null);
      // 可选：显示提示
      alert('对话已存档');
    } catch (error) {
      console.error('存档失败:', error);
      alert('存档失败，请重试');
    }
  };

  // 监听浏览器后退/前进
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const pathMatch = window.location.pathname.match(/\/chat\/(.+)/);
      if (pathMatch) {
        const chatId = pathMatch[1];
        const history = chatHistories.find(h => h.id === chatId);
        if (history) {
          setMessages(history.messages);
          setSelectedChatId(chatId);
        }
      } else {
        // 如果回到 /chat，清空当前对话
        setMessages([]);
        setSelectedChatId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [chatHistories]);

  // 添加删除单个聊天记录的函数
  const deleteChatHistory = async (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();  // 阻止事件冒泡，避免触发点击事件
    
    const confirmed = window.confirm('确定要删除这条聊天记录吗？');
    if (!confirmed) return;

    try {
      // 删除 Firestore 中的文档
      await deleteDoc(doc(db, 'chatHistories', historyId));
      
      // 更新本地状态
      setChatHistories(prev => prev.filter(h => h.id !== historyId));
      
      // 如果当前正在查看这条记录，清空消息
      if (selectedChatId === historyId) {
        setMessages([]);
        setSelectedChatId(null);
      }
    } catch (error) {
      console.error('删除聊天记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className={styles.chatLayout}>
      {/* 侧边栏 */}
      <div className={styles.sidebar}>
        {/* 添加侧边栏标题 */}
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>聊天记录</h2>
        </div>
        
        <div className={styles.chatHistoriesContainer}>
          {chatHistories.map((history) => (
            <div
              key={history.id}
              className={`${styles.chatHistory} ${
                selectedChatId === history.id ? styles.active : ''
              }`}
              onClick={() => loadChatHistory(history)}
            >
              <div className={styles.chatHistoryContent}>
                <div className={styles.chatHistoryTitle}>{history.title}</div>
                <div className={styles.chatHistoryDate}>
                  {new Date(history.timestamp).toLocaleDateString()}
                </div>
              </div>
              <button
                className={styles.chatHistoryDelete}
                onClick={(e) => deleteChatHistory(history.id, e)}
                title="删除此记录"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        
        {/* 删除按钮 */}
        <div className={styles.sidebarFooter}>
          <button 
            onClick={deleteAllChatHistories}
            className={styles.deleteButton}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            清空历史记录
          </button>
        </div>
      </div>

      {/* 主要聊天区域 */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.logo}>
              云端AI助手
            </Link>
          </div>
          <div className={styles.headerRight}>
            {/* 用户信息 */}
            {user && (
              <div className={styles.userInfo}>
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt="用户头像" 
                    className={styles.userAvatar}
                  />
                )}
                <span className={styles.userName}>
                  {user.displayName || user.email}
                </span>
                <button 
                  onClick={handleSignOut}
                  className={styles.signOutButton}
                >
                  退出
                </button>
              </div>
            )}
            {/* 操作按钮 */}
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
            {/* 添加存档按钮 */}
            {messages.length > 0 && (
              <button 
                onClick={handleArchive}
                className={styles.archiveButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.archiveIcon}>
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                </svg>
                存档对话
              </button>
            )}
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

        {/* 添加分隔线 */}
        <div className={styles.inputDivider} />

        {/* 输入框容器 */}
        <div className={styles.inputContainer}>
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