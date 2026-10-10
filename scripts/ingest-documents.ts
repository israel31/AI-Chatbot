
import 'dotenv/config';
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { DEFAULT_COMPANY_DOCUMENTS } from '../src/data/defaultDocs';

config({ path: '.env.local', override: true });

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const TABLE_URL = `${SUPABASE_URL}/rest/v1/document_chunks`;
const EMBEDDING_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    throw new Error(
        'Missing environment variables. Check SUPABASE_URL, ' +
        'SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env.local.'
    );
}

interface KnowledgeChunk {
    document_id: string;
    chunk_index: number;
    document_title: string;
    category: string;
    section_heading: string;
    content: string;
    embedding: string;
    content_hash: string;
    updated_at: string;
}

function hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

function splitIntoChunks(content: string): Array<{
    heading: string;
    content: string;
}> {
    const normalized = content.replace(/\r\n/g, '\n').trim();

    const sections = normalized.split(/(?=^#{1,6}\s+)/gm);
    const chunks: Array<{ heading: string; content: string }> = [];

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/m);
        const heading = headingMatch
            ? headingMatch[1].trim()
            : 'General information';

        if (trimmed.length <= CHUNK_SIZE) {
            chunks.push({ heading, content: trimmed });
            continue;
        }

        let start = 0;

        while (start < trimmed.length) {
            const end = Math.min(start + CHUNK_SIZE, trimmed.length);
            const piece = trimmed.slice(start, end).trim();

            if (piece) {
                chunks.push({ heading, content: piece });
            }

            if (end >= trimmed.length) break;
            start = end - CHUNK_OVERLAP;
        }
    }

    return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            const response = await fetch(
                `${EMBEDDING_URL}?key=${encodeURIComponent(GEMINI_API_KEY!)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'models/gemini-embedding-001',
                        content: {
                            parts: [{ text }],
                        },
                        taskType: 'RETRIEVAL_DOCUMENT',
                        outputDimensionality: 768,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Gemini embedding error (${response.status}): ${errorText}`
                );
            }

            const result = await response.json();
            const values = result.embedding?.values;

            if (!Array.isArray(values) || values.length !== 768) {
                throw new Error(
                    `Expected 768 embedding values; received ${values?.length ?? 0
                    }.`
                );
            }

            return values;
        } catch (error) {
            lastError = error;

            if (attempt < 4) {
                const delay = attempt * 1500;
                console.warn(
                    `Embedding attempt ${attempt} failed. Retrying in ${delay}ms...`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Could not generate embedding.');
}

async function supabaseRequest(
    url: string,
    options: RequestInit = {}
): Promise<void> {
    const response = await fetch(url, {
        ...options,
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(
            `Supabase error (${response.status}): ${await response.text()}`
        );
    }
}

async function processDocument(
    doc: (typeof DEFAULT_COMPANY_DOCUMENTS)[number]
): Promise<void> {
    console.log(`\nProcessing: ${doc.title}`);

    const pieces = splitIntoChunks(doc.content);
    const prepared: KnowledgeChunk[] = [];

    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];

        const embeddingInput = [
            `Document: ${doc.title}`,
            `Category: ${doc.category}`,
            `Section: ${piece.heading}`,
            `Content:\n${piece.content}`,
        ].join('\n');

        console.log(`  Embedding chunk ${i + 1}/${pieces.length}...`);

        const vector = await generateEmbedding(embeddingInput);

        prepared.push({
            document_id: doc.id,
            chunk_index: i,
            document_title: doc.title,
            category: doc.category ?? '',
            section_heading: piece.heading,
            content: piece.content,
            embedding: `[${vector.join(',')}]`,
            content_hash: hashText(piece.content),
            updated_at: new Date().toISOString(),
        });
    }

    // Upsert the new chunks before removing obsolete chunks.
    // This preserves existing data if embedding generation fails.
    if (prepared.length > 0) {
        await supabaseRequest(
            `${TABLE_URL}?on_conflict=document_id%2Cchunk_index`,
            {
                method: 'POST',
                headers: {
                    Prefer: 'resolution=merge-duplicates,return=minimal',
                },
                body: JSON.stringify(prepared),
            }
        );
    }

    // Remove outdated extra chunks belonging to this document only.
    const staleChunksUrl =
        `${TABLE_URL}?document_id=eq.${encodeURIComponent(doc.id)}` +
        `&chunk_index=gte.${prepared.length}`;

    await supabaseRequest(staleChunksUrl, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
    });

    console.log(`  Saved ${prepared.length} chunks successfully.`);
}

async function main(): Promise<void> {
    console.log('Starting document ingestion...');
    console.log(`Documents to process: ${DEFAULT_COMPANY_DOCUMENTS.length}`);

    for (const doc of DEFAULT_COMPANY_DOCUMENTS) {
        await processDocument(doc);
    }

    console.log('\nAll default documents have been ingested successfully.');
    console.log(
        'Next: verify the chunk count in Supabase before changing the chatbot.'
    );
}

main().catch((error) => {
    console.error('\nDocument ingestion failed:', error);
    process.exitCode = 1;
});
