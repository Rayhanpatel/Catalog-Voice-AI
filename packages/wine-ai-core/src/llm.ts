import type { ConversationTurn } from './types'

interface StreamCallbacks {
  onChunk?: (chunk: string, fullText: string) => void
  onDone?: (fullText: string) => void
  onError?: (error: Error) => void
}

interface CatalogQuestionStreamOptions extends StreamCallbacks {
  question: string
  wineCatalog: string
  conversationHistory?: ConversationTurn[]
  systemPrompt: string
  projectId: string
  location?: string
  model?: string
  endpointBase?: string
  retrievalNote?: string | null
}

interface CatalogQuestionOptions {
  question: string
  wineCatalog: string
  conversationHistory?: ConversationTurn[]
  systemPrompt: string
  projectId: string
  location?: string
  model?: string
  endpointBase?: string
  retrievalNote?: string | null
}

function buildContents(question: string, wineCatalog: string, conversationHistory: ConversationTurn[], retrievalNote?: string | null) {
  const contents = conversationHistory.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : turn.role,
    parts: [{ text: turn.text }],
  }))

  const contextParts = [retrievalNote ? `RETRIEVAL NOTE:\n${retrievalNote}\n` : '', `WINE CATALOG:\n${wineCatalog}\n\nCUSTOMER QUESTION: ${question}`]

  contents.push({
    role: 'user',
    parts: [{ text: contextParts.join('') }],
  })

  return contents
}

function buildRequestBody(
  question: string,
  wineCatalog: string,
  conversationHistory: ConversationTurn[],
  systemPrompt: string,
  retrievalNote?: string | null,
) {
  return {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: buildContents(question, wineCatalog, conversationHistory, retrievalNote),
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  }
}

export function askCatalogQuestionStream({
  question,
  wineCatalog,
  conversationHistory = [],
  systemPrompt,
  projectId,
  location = 'us-central1',
  model = 'gemini-2.5-flash',
  endpointBase = '/api/vertex',
  retrievalNote,
  onChunk,
  onDone,
  onError,
}: CatalogQuestionStreamOptions) {
  const url = `${endpointBase}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent?alt=sse`
  const controller = new AbortController()
  const body = buildRequestBody(question, wineCatalog, conversationHistory, systemPrompt, retrievalNote)

  void (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API error ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error('Empty response stream from Vertex AI.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''

        for (const block of blocks) {
          const dataLine = block
            .split('\n')
            .find((line) => line.startsWith('data: '))

          if (!dataLine) {
            continue
          }

          const jsonText = dataLine.slice(6).trim()

          if (!jsonText || jsonText === '[DONE]') {
            continue
          }

          try {
            const data = JSON.parse(jsonText) as {
              error?: { message?: string }
              candidates?: Array<{
                content?: {
                  parts?: Array<{ text?: string }>
                }
              }>
            }

            if (data.error) {
              throw new Error(`Vertex API error: ${data.error.message ?? jsonText}`)
            }

            const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (chunkText) {
              fullText += chunkText
              onChunk?.(chunkText, fullText)
            }
          } catch (error) {
            if (error instanceof Error && error.message.startsWith('Vertex API error')) {
              throw error
            }

            console.warn('Skipping malformed SSE chunk.', error)
          }
        }
      }

      if (buffer.trim()) {
        const dataLine = buffer
          .split('\n')
          .find((line) => line.startsWith('data: '))

        if (dataLine) {
          const jsonText = dataLine.slice(6).trim()

          if (jsonText && jsonText !== '[DONE]') {
            const data = JSON.parse(jsonText) as {
              error?: { message?: string }
              candidates?: Array<{
                content?: {
                  parts?: Array<{ text?: string }>
                }
              }>
            }

            if (data.error) {
              throw new Error(`Vertex API error: ${data.error.message ?? jsonText}`)
            }

            const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (chunkText) {
              fullText += chunkText
              onChunk?.(chunkText, fullText)
            }
          }
        }
      }

      if (fullText) {
        onDone?.(fullText)
      } else {
        onError?.(new Error('No response received. The model may have returned an empty reply.'))
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      onError?.(error instanceof Error ? error : new Error('Unknown Vertex AI error'))
    }
  })()

  return () => controller.abort()
}

export async function askCatalogQuestion({
  question,
  wineCatalog,
  conversationHistory = [],
  systemPrompt,
  projectId,
  location = 'us-central1',
  model = 'gemini-2.5-flash',
  endpointBase = '/api/vertex',
  retrievalNote,
}: CatalogQuestionOptions) {
  const url = `${endpointBase}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  const body = buildRequestBody(question, wineCatalog, conversationHistory, systemPrompt, retrievalNote)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const parts = data.candidates?.[0]?.content?.parts

  if (!parts?.length) {
    throw new Error('Empty response from model.')
  }

  return parts.map((part) => part.text ?? '').join('')
}
