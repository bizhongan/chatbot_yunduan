'use client'
import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-lg z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105"></div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                DeepSeek Chat
              </span>
            </div>
            <Link 
              href="/chat"
              className="px-6 py-2.5 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              开始对话
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-40 right-1/4 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-3xl animate-pulse delay-500"></div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-8 tracking-tight relative">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                智能对话新境界
              </span>
              <span className="block mt-4 text-4xl md:text-5xl text-gray-700">
                DeepSeek AI Assistant
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              体验 DeepSeek 强大的语言模型，开启智能对话新时代
            </p>
            <Link 
              href="/chat" 
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              立即开始对话
              <svg className="w-6 h-6 ml-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mt-32">
            {[
              {
                title: '超强对话能力',
                description: '基于先进的大语言模型，理解更准确，回答更专业',
                icon: '🧠',
                gradient: 'from-blue-50 to-blue-100'
              },
              {
                title: '实时响应',
                description: '毫秒级响应速度，流畅的对话体验',
                icon: '⚡',
                gradient: 'from-purple-50 to-purple-100'
              },
              {
                title: '多场景支持',
                description: '支持多种对话场景，满足您的各类需求',
                icon: '🎯',
                gradient: 'from-indigo-50 to-indigo-100'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="mt-32 grid md:grid-cols-3 gap-8">
            {[
              { number: '10M+', label: '日对话量', icon: '💬' },
              { number: '99.9%', label: '服务可用性', icon: '🎯' },
              { number: '24/7', label: '全天候服务', icon: '⚡' }
            ].map((stat, index) => (
              <div key={index} className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50 text-center hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-gray-600 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/70 backdrop-blur-lg border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500">© 2024 DeepSeek Chat Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
} 