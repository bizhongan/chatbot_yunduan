import { NextResponse } from 'next/server'

// 直接定义 API URL 和 API Key
const API_URL = 'https://api.deepseek.com/v1/chat/completions'
const API_KEY = 'sk-851b668317054a83abeaf19acd85d9e0'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API 错误: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取响应')

    // 处理流式响应
    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk
            .split('\n')
            .filter((line: string) => line.trim() !== '')

          for (const line of lines) {
            if (line.includes('[DONE]')) continue
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.choices[0]?.delta?.content) {
                  await writer.write(
                    encoder.encode(data.choices[0].delta.content)
                  )
                }
              } catch (e) {
                console.error('JSON parse error:', e)
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error)
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable)

  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    )
  }
} 