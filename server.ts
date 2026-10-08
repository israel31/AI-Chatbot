import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const app = express();

const PORT =
  Number(process.env.PORT) ||
  3000;

app.use(
  express.json({
    limit: '10mb',
  })
);

type Doc = {
  id?: string;
  title?: string;
  category?: string;
  content: string;
  summary?: string;
};

type RetrievedChunk = {
  docId: string;
  title: string;
  category: string;
  heading: string;
  content: string;
  score: number;
};

const PRIMARY_MODEL =
  'gemini-2.5-flash';

const FALLBACK_MODEL =
  'gemini-2.5-flash-lite';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (
    !apiKey ||
    apiKey ===
    'MY_GEMINI_API_KEY'
  ) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,

    httpOptions: {
      headers: {
        'User-Agent':
          'aistudio-build',
      },
    },
  });
}

function tokenize(
  text: string
): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 2
        )
    ),
  ];
}

function retrieveRelevantChunks(
  query: string,
  documents: Doc[],
  maxChunks = 8
): RetrievedChunk[] {
  const queryTerms =
    tokenize(query);

  if (
    queryTerms.length === 0
  ) {
    return [];
  }

  const chunks: RetrievedChunk[] =
    [];

  for (const doc of documents) {
    if (
      !doc ||
      !doc.content ||
      typeof doc.content !==
      'string'
    ) {
      continue;
    }

    const title =
      doc.title ||
      'Untitled Document';

    const category =
      doc.category || '';

    const docId =
      doc.id || title;

    const sections =
      doc.content.split(
        /(?=^#{1,6}\s+)/gm
      );

    for (const section of sections) {
      const cleanedSection =
        section.trim();

      if (!cleanedSection) {
        continue;
      }

      const headingMatch =
        cleanedSection.match(
          /^#{1,6}\s+(.+)/
        );

      const heading =
        headingMatch?.[1]?.trim() ||
        title;

      const chunkSize = 1400;

      for (
        let start = 0;
        start <
        cleanedSection.length;
        start += chunkSize
      ) {
        const content =
          cleanedSection
            .slice(
              start,
              start + chunkSize
            )
            .trim();

        if (!content) {
          continue;
        }

        const searchableTitle =
          title.toLowerCase();

        const searchableCategory =
          category.toLowerCase();

        const searchableHeading =
          heading.toLowerCase();

        const searchableContent =
          content.toLowerCase();

        let score = 0;

        for (const term of queryTerms) {
          if (
            searchableTitle.includes(
              term
            )
          ) {
            score += 8;
          }

          if (
            searchableCategory.includes(
              term
            )
          ) {
            score += 5;
          }

          if (
            searchableHeading.includes(
              term
            )
          ) {
            score += 6;
          }

          if (
            searchableContent.includes(
              term
            )
          ) {
            score += 2;
          }
        }

        if (score > 0) {
          chunks.push({
            docId,
            title,
            category,
            heading,
            content,
            score,
          });
        }
      }
    }
  }

  chunks.sort(
    (a, b) =>
      b.score - a.score
  );

  const selected: RetrievedChunk[] =
    [];

  const seen = new Set<string>();

  for (const chunk of chunks) {
    const key =
      `${chunk.docId}:${chunk.heading}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    selected.push(chunk);

    if (
      selected.length >= maxChunks
    ) {
      break;
    }
  }

  return selected;
}

function localDocSearch(
  query: string,
  documents: Doc[]
) {
  const retrievedChunks =
    retrieveRelevantChunks(
      query,
      documents,
      5
    );

  if (
    retrievedChunks.length > 0
  ) {
    const bestChunk =
      retrievedChunks[0];

    return {
      isGrounded: true,

      confidence: Math.min(
        0.95,
        0.5 +
        bestChunk.score * 0.05
      ),

      answer:
        `Based on **${bestChunk.title}**:\n\n` +
        bestChunk.content.slice(
          0,
          1000
        ),

      citations: [
        {
          documentId:
            bestChunk.docId,

          documentTitle:
            bestChunk.title,

          sectionHeading:
            bestChunk.heading ||
            'Overview',

          exactQuote:
            bestChunk.content.slice(
              0,
              150
            ),

          relevanceScore:
            Math.min(
              1,
              bestChunk.score / 20
            ),
        },
      ],

      searchedDocs: [
        ...new Set(
          retrievedChunks.map(
            (chunk) =>
              chunk.title
          )
        ),
      ].slice(0, 5),

      gapAnalysis: '',
    };
  }

  return {
    isGrounded: false,

    confidence: 0,

    answer:
      "I cannot answer this question because the information is not contained in our company's internal documentation. To maintain data security and accuracy, I do not retrieve information from outside internet sources.",

    citations: [],

    searchedDocs:
      documents
        .slice(0, 5)
        .map(
          (doc) =>
            doc.title ||
            'Untitled Document'
        ),

    gapAnalysis:
      `The requested query "${query}" does not match any policies or specifications across internal documents.`,
  };
}

function isTransientGeminiError(
  error: any
): boolean {
  const status =
    error?.status ??
    error?.code ??
    error?.error?.code;

  const numericStatus =
    Number(status);

  if (
    [
      429,
      500,
      502,
      503,
      504,
    ].includes(numericStatus)
  ) {
    return true;
  }

  const message =
    String(
      error?.message ||
      error?.error?.message ||
      ''
    ).toLowerCase();

  return (
    message.includes(
      'high demand'
    ) ||
    message.includes(
      'temporarily unavailable'
    ) ||
    message.includes(
      'service unavailable'
    ) ||
    message.includes(
      'overloaded'
    ) ||
    message.includes(
      'rate limit'
    ) ||
    message.includes(
      'too many requests'
    )
  );
}

const responseSchema = {
  type: Type.OBJECT,

  properties: {
    isGrounded: {
      type: Type.BOOLEAN,
    },

    answer: {
      type: Type.STRING,
    },

    confidence: {
      type: Type.NUMBER,
    },

    citations: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          documentId: {
            type: Type.STRING,
          },

          documentTitle: {
            type: Type.STRING,
          },

          sectionHeading: {
            type: Type.STRING,
          },

          exactQuote: {
            type: Type.STRING,
          },

          relevanceScore: {
            type: Type.NUMBER,
          },
        },

        required: [
          'documentId',
          'documentTitle',
          'exactQuote',
        ],
      },
    },

    searchedDocs: {
      type: Type.ARRAY,

      items: {
        type: Type.STRING,
      },
    },

    gapAnalysis: {
      type: Type.STRING,
    },
  },

  required: [
    'isGrounded',
    'answer',
    'confidence',
    'citations',
    'searchedDocs',
  ],
};

function buildSystemInstruction(
  strictMode: boolean
): string {
  return `You are the JCIN UNIBEN AI Assistant.

Your EXCLUSIVE and ABSOLUTE source of truth is the provided internal company documents.

STRICT MANDATORY RULES:

1. ZERO EXTERNAL RETRIEVAL:
You are strictly forbidden from retrieving or using ANY external knowledge, outside websites, general trivia, historical events, personal opinions, or internet facts not explicitly stated in the provided documents.

2. NEGATIVE FALLBACK:
If the answer to the user's question is NOT explicitly present or directly answerable from the provided documentation, you MUST set isGrounded to false.

The answer text MUST clearly state:

"I cannot answer this question because the requested information is not contained in the company's internal documentation."

3. EXACT GROUNDING & CITATIONS:
When the information IS present:
- Set isGrounded to true.
- Cite the exact document ID.
- Cite the exact document title.
- Cite the relevant section heading.
- Provide an exact quote from the provided source.
- Provide a clear professional conversational answer.
- Do not dump entire documents.

4. NO SPECULATION:
Never guess, extrapolate, assume, or invent policies that are not explicitly supported by the provided documents.

5. RETRIEVED SOURCES:
The provided sources have been selected by a local retrieval system. Only use the supplied sources as evidence.

6. STRICT MODE:
${strictMode
      ? 'Strict grounding is enabled. Do not answer from anything outside the supplied sources.'
      : 'Use the supplied sources as the primary source of truth.'
    }`;
}

function buildUserPrompt(
  query: string,
  retrievedChunks: RetrievedChunk[]
): string {
  const formattedDocs =
    retrievedChunks
      .map(
        (chunk, index) =>
          `--- SOURCE [${index + 1}] ---
DOCUMENT ID: ${chunk.docId}
TITLE: ${chunk.title}
CATEGORY: ${chunk.category}
SECTION: ${chunk.heading}

${chunk.content}
--- END SOURCE [${index + 1}] ---`
      )
      .join('\n\n');

  return `RETRIEVED INTERNAL COMPANY DOCUMENTATION:

${formattedDocs}

USER QUESTION:
"${query}"

Answer the user's question strictly according to the retrieved internal documentation above.

Return a structured JSON response matching the required schema.`;
}

async function generateWithModel(
  ai: GoogleGenAI,
  model: string,
  systemInstruction: string,
  userPrompt: string
) {
  const startedAt =
    Date.now();

  try {
    console.log(
      `[GEMINI] Trying ${model}`
    );

    const response =
      await ai.models.generateContent(
        {
          model,

          contents: userPrompt,

          config: {
            systemInstruction,

            temperature: 0,

            topP: 0.1,

            responseMimeType:
              'application/json',

            responseSchema,
          },
        }
      );

    console.log(
      `[GEMINI] ${model} completed in ${Date.now() -
      startedAt
      }ms`
    );

    return response;
  } catch (error: any) {
    console.warn(
      `[GEMINI] ${model} failed after ${Date.now() -
      startedAt
      }ms:`,
      error?.message ||
      error
    );

    throw error;
  }
}

app.get(
  '/api/health',
  (_req, res) => {
    res.json({
      status: 'ok',

      hasGeminiKey: Boolean(
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !==
        'MY_GEMINI_API_KEY'
      ),

      primaryModel:
        PRIMARY_MODEL,

      fallbackModel:
        FALLBACK_MODEL,

      timestamp:
        new Date().toISOString(),
    });
  }
);

app.post(
  '/api/query',
  async (req, res) => {
    const requestStartedAt =
      Date.now();

    try {
      const {
        query,
        documents,
        strictMode = true,
      } = req.body;

      if (
        !query ||
        typeof query !== 'string'
      ) {
        return res.status(400).json({
          error:
            'Query string is required',
        });
      }

      if (
        !Array.isArray(
          documents
        ) ||
        documents.length === 0
      ) {
        return res.status(400).json({
          error:
            'At least one internal document is required for grounding',
        });
      }

      console.log(
        `[QUERY] "${query}" started`
      );

      const retrievedChunks =
        retrieveRelevantChunks(
          query,
          documents,
          8
        );

      console.log(
        `[RETRIEVAL] ${retrievedChunks.length} chunks selected in ${Date.now() -
        requestStartedAt
        }ms`
      );

      if (
        retrievedChunks.length === 0
      ) {
        return res.json(
          localDocSearch(
            query,
            documents
          )
        );
      }

      const ai =
        getGeminiClient();

      if (!ai) {
        return res.json(
          localDocSearch(
            query,
            documents
          )
        );
      }

      const systemInstruction =
        buildSystemInstruction(
          strictMode
        );

      const userPrompt =
        buildUserPrompt(
          query,
          retrievedChunks
        );

      let response;

      /*
       * PRIMARY MODEL
       */
      try {
        response =
          await generateWithModel(
            ai,
            PRIMARY_MODEL,
            systemInstruction,
            userPrompt
          );
      } catch (primaryError) {
        /*
         * Only switch models when the failure
         * looks temporary.
         */
        if (
          !isTransientGeminiError(
            primaryError
          )
        ) {
          console.error(
            '[GEMINI] Primary model failed with a non-transient error.'
          );

          return res.json(
            localDocSearch(
              query,
              documents
            )
          );
        }

        console.log(
          `[GEMINI] ${PRIMARY_MODEL} temporarily unavailable. Trying ${FALLBACK_MODEL}...`
        );

        /*
         * FAST FALLBACK
         */
        try {
          response =
            await generateWithModel(
              ai,
              FALLBACK_MODEL,
              systemInstruction,
              userPrompt
            );
        } catch (fallbackError) {
          console.error(
            `[GEMINI] ${FALLBACK_MODEL} also failed.`
          );

          return res.json(
            localDocSearch(
              query,
              documents
            )
          );
        }
      }

      if (!response) {
        return res.json(
          localDocSearch(
            query,
            documents
          )
        );
      }

      const responseText =
        response.text;

      if (!responseText) {
        return res.json(
          localDocSearch(
            query,
            documents
          )
        );
      }

      let parsedData: any;

      try {
        parsedData =
          JSON.parse(
            responseText
          );
      } catch (error) {
        console.error(
          '[GEMINI] Invalid JSON response.'
        );

        return res.json(
          localDocSearch(
            query,
            documents
          )
        );
      }

      if (
        Array.isArray(
          parsedData.citations
        )
      ) {
        parsedData.citations =
          parsedData.citations
            .slice(0, 3)
            .map(
              (citation: any) => ({
                ...citation,

                exactQuote:
                  String(
                    citation.exactQuote ||
                    ''
                  ).slice(
                    0,
                    200
                  ),
              })
            );
      }

      if (
        Array.isArray(
          parsedData.searchedDocs
        )
      ) {
        parsedData.searchedDocs =
          parsedData.searchedDocs.slice(
            0,
            5
          );
      }

      if (
        typeof parsedData.answer ===
        'string' &&
        parsedData.answer.length >
        1500
      ) {
        parsedData.answer =
          parsedData.answer.slice(
            0,
            1500
          ) + '...';
      }

      console.log(
        `[QUERY] completed in ${Date.now() -
        requestStartedAt
        }ms`
      );

      return res.json(
        parsedData
      );
    } catch (error: any) {
      console.error(
        '[QUERY] Unexpected error:',
        error
      );

      try {
        return res.json(
          localDocSearch(
            req.body.query,
            req.body.documents ||
            []
          )
        );
      } catch {
        return res.status(500).json(
          {
            error:
              'Internal server error processing documentation query',

            message:
              error?.message ||
              'Unknown error',
          }
        );
      }
    }
  }
);

async function startServer() {
  if (
    process.env.NODE_ENV !==
    'production'
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: 'spa',
      });

    app.use(
      vite.middlewares
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        'dist'
      );

    app.use(
      express.static(
        distPath
      )
    );

    app.get(
      '*',
      (_req, res) => {
        res.sendFile(
          path.join(
            distPath,
            'index.html'
          )
        );
      }
    );
  }

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `Internal Documentation AI Server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}

startServer();