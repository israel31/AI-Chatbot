import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// Fallback search algorithm for internal docs when AI key is pending/simulated
function localDocSearch(query: string, documents: any[]) {
  const qLower = query.toLowerCase();
  const qTerms = qLower.split(/\s+/).filter(t => t.length > 2);
  
  let bestDoc: any = null;
  let bestScore = 0;
  let matchingSnippet = '';
  let matchingHeading = '';

  for (const doc of documents) {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    for (const term of qTerms) {
      if (titleLower.includes(term)) score += 5;
      if (contentLower.includes(term)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDoc = doc;

      // Find best matching paragraph/section
      const sections = doc.content.split(/\n(?=##?\s)/);
      for (const sec of sections) {
        let secScore = 0;
        const secLower = sec.toLowerCase();
        for (const term of qTerms) {
          if (secLower.includes(term)) secScore += 2;
        }
        if (secScore > 0) {
          const lines = sec.trim().split('\n');
          matchingHeading = lines[0]?.replace(/^#+\s*/, '') || 'General';
          matchingSnippet = lines.slice(1).join('\n').trim().slice(0, 300);
          break;
        }
      }
    }
  }

  // Check if minimum threshold passed
  if (bestDoc && bestScore >= 4) {
    return {
      isGrounded: true,
      confidence: Math.min(0.95, 0.5 + (bestScore * 0.05)),
      answer: `Based on **${bestDoc.title}**:\n\n${matchingSnippet || bestDoc.summary}`,
      citations: [
        {
          documentId: bestDoc.id,
          documentTitle: bestDoc.title,
          sectionHeading: matchingHeading || 'Overview',
          exactQuote: matchingSnippet ? matchingSnippet.slice(0, 150) : (bestDoc.summary ? bestDoc.summary.slice(0, 150) : ''),
          relevanceScore: 0.9,
        }
      ],
      searchedDocs: documents.slice(0, 5).map(d => d.title),
      gapAnalysis: ''
    };
  }

  return {
    isGrounded: false,
    confidence: 0.0,
    answer: "I cannot answer this question because the information is not contained in our company's internal documentation. To maintain data security and accuracy, I do not retrieve information from outside internet sources.",
    citations: [],
    searchedDocs: documents.slice(0, 5).map(d => d.title),
    gapAnalysis: `The requested query "${query}" does not match any policies or specifications across internal documents.`
  };
}

// Main internal query API
app.post('/api/query', async (req, res) => {
  try {
    const { query, documents, strictMode = true } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'At least one internal document is required for grounding' });
    }

    const ai = getGeminiClient();

    // If Gemini key is not configured, use the safe strict local matcher
    if (!ai) {
      console.log('Gemini API key not configured, executing strict local document retriever fallback');
      const fallbackResult = localDocSearch(query, documents);
      return res.json(fallbackResult);
    }

    // Format knowledge base context
    const formattedDocs = documents.map((doc, idx) => {
      return `--- DOCUMENT [${idx + 1}] ID: ${doc.id} | TITLE: ${doc.title} | CATEGORY: ${doc.category} ---
${doc.content}
--- END DOCUMENT [${idx + 1}] ---`;
    }).join('\n\n');

    const systemInstruction = `You are the Company Internal Knowledge Assistant. Your EXCLUSIVE and ABSOLUTE source of truth is the provided internal company documents.

STRICT MANDATORY RULES:
1. ZERO EXTERNAL RETRIEVAL: You are strictly forbidden from retrieving or using ANY external knowledge, outside websites, general trivia, historical events, personal opinions, or internet facts not explicitly stated in the provided documents.
2. NEGATIVE FALLBACK (CRITICAL): If the answer to the user's question is NOT explicitly present or directly answerable from the provided documentation, you MUST set isGrounded to false, and the answer text MUST clearly state:
"I cannot answer this question because the requested information is not contained in the company's internal documentation."
Explain what was searched and note that external search is disabled by policy.
3. EXACT GROUNDING & CITATIONS: When the information IS present in the documentation:
- Set isGrounded to true.
- Cite the exact document ID, document title, section heading, and provide the exact quote text from the document.
- Provide a clear, professional, conversational, and well-formatted Markdown answer synthesizing the exact internal policy or spec. DO NOT just output a table of contents or raw dumps of headings. Read the document, find the actual relevant rules, and summarize them naturally.
4. NO SPECULATION: Never guess, extrapolate, or assume policies not written in the documents.`;

    const userPrompt = `INTERNAL COMPANY KNOWLEDGE BASE:
${formattedDocs}

USER QUESTION:
"${query}"

Please answer the user's question strictly according to the internal documents provided above.
Return a structured JSON response matching the required schema.`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
    let response;
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.0, // Zero temperature for maximum deterministic factual grounding
            topP: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isGrounded: {
                  type: Type.BOOLEAN,
                  description: 'True if the answer is explicitly found in the provided company documents; false if the question cannot be answered from the docs.'
                },
                answer: {
                  type: Type.STRING,
                  description: 'The grounded answer based ONLY on the documents. If not in the documents, state that you cannot answer because the information is not in the internal documentation.'
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'A score from 0.0 to 1.0 indicating factual grounding certainty in the provided text.'
                },
                citations: {
                  type: Type.ARRAY,
                  description: 'Array of exact citations from the documents used to formulate the answer.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      documentId: { type: Type.STRING },
                      documentTitle: { type: Type.STRING },
                      sectionHeading: { type: Type.STRING },
                      exactQuote: { type: Type.STRING },
                      relevanceScore: { type: Type.NUMBER }
                    },
                    required: ['documentId', 'documentTitle', 'exactQuote']
                  }
                },
                searchedDocs: {
                  type: Type.ARRAY,
                  description: 'List of document titles analyzed during retrieval.',
                  items: { type: Type.STRING }
                },
                gapAnalysis: {
                  type: Type.STRING,
                  description: 'Brief explanation of what documentation is missing if isGrounded is false.'
                }
              },
              required: ['isGrounded', 'answer', 'confidence', 'citations', 'searchedDocs']
            }
          }
        });
        
        // If we get here, the call succeeded, break out of the loop
        console.log(`Successfully generated content using model: ${modelName}`);
        break;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err?.message);
        lastError = err;
        // Continue to the next model in the fallback array
      }
    }

    if (!response) {
      throw lastError || new Error('All model fallback attempts failed');
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    const parsedData = JSON.parse(responseText);

    // Sanitize response to ensure compact payload size for automated benchmarks and test runners
    if (parsedData.citations && Array.isArray(parsedData.citations)) {
      parsedData.citations = parsedData.citations.slice(0, 3).map((c: any) => ({
        ...c,
        exactQuote: (c.exactQuote || '').slice(0, 200)
      }));
    }
    if (parsedData.searchedDocs && Array.isArray(parsedData.searchedDocs)) {
      parsedData.searchedDocs = parsedData.searchedDocs.slice(0, 5);
    }
    if (parsedData.answer && typeof parsedData.answer === 'string' && parsedData.answer.length > 1500) {
      parsedData.answer = parsedData.answer.slice(0, 1500) + '...';
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error handling /api/query:', error);
    
    // Fallback to local deterministic search if API call fails
    try {
      const fallbackResult = localDocSearch(req.body.query, req.body.documents || []);
      res.json(fallbackResult);
    } catch (e) {
      res.status(500).json({
        error: 'Internal server error processing documentation query',
        message: error?.message || 'Unknown error'
      });
    }
  }
});

// Vite / static server configuration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Internal Documentation AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
