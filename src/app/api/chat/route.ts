import { NextResponse } from 'next/server'

// 从环境变量中获取配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL

if (!DEEPSEEK_API_KEY) {
  throw new Error('Missing DEEPSEEK_API_KEY environment variable')
}

if (!DEEPSEEK_API_URL) {
  throw new Error('Missing DEEPSEEK_API_URL environment variable')
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // 创建编码器和解码器
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // 调用 DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
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

          // 使用 decoder 而不是 encoder 来解码
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