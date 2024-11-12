import { NextResponse } from 'next/server'

// 使用 beta API URL
const API_URL = 'https://api.deepseek.com/beta/chat/completions'
const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-851b668317054a83abeaf19acd85d9e0'

// 改进重试函数
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // 检查响应状态
      if (response.ok) {
        return response;
      }
      
      // 如果响应不是 200，获取错误信息
      const errorData = await response.json();
      lastError = new Error(`API responded with status ${response.status}: ${JSON.stringify(errorData)}`);
      
      // 如果是 401/403，不要重试
      if (response.status === 401 || response.status === 403) {
        throw lastError;
      }
      
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试，抛出错误
      if (i === maxRetries - 1) {
        break;
      }
      
      // 等待时间随重试次数增加
      const waitTime = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`Retry attempt ${i + 1}/${maxRetries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Maximum retries reached');
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const response = await fetchWithRetry(API_URL, {
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
        max_tokens: 8000,
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
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
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
        if (buffer) {
          try {
            const data = JSON.parse(buffer.slice(6))
            if (data.choices[0]?.delta?.content) {
              await writer.write(
                encoder.encode(data.choices[0].delta.content)
              )
            }
          } catch (e) {
            console.error('Final buffer parse error:', e)
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error)
        await writer.write(encoder.encode('\n\n[生成回答时发生错误，请重试]'))
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