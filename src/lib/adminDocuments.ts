
import type { DocumentItem } from '../types';

const ADMIN_DOCUMENTS_URL =
    'https://eroogvrsmlfpcdmnvxsf.supabase.co/functions/v1/admin-documents';

const SECRET_STORAGE_KEY = 'jcin_admin_api_secret';

function getAdminSecret(): string {
    let secret = sessionStorage.getItem(SECRET_STORAGE_KEY);

    if (!secret) {
        secret =
            window.prompt('Enter the admin document-management secret:')?.trim() ??
            '';

        if (!secret) {
            throw new Error('Admin secret is required to manage documents.');
        }

        sessionStorage.setItem(SECRET_STORAGE_KEY, secret);
    }

    return secret;
}

async function request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    body?: unknown,
    id?: string,
): Promise<T> {
    const url = new URL(ADMIN_DOCUMENTS_URL);

    if (id) {
        url.searchParams.set('id', id);
    }

    const response = await fetch(url.toString(), {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': getAdminSecret(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
        sessionStorage.removeItem(SECRET_STORAGE_KEY);
        throw new Error(
            'Invalid admin secret. Reload the page and enter the correct secret.',
        );
    }

    if (!response.ok) {
        throw new Error(
            result?.error || `Request failed (${response.status}).`,
        );
    }

    return result as T;
}

interface DatabaseDocument {
    id: string;
    title: string;
    category: string;
    author: string;
    version: string;
    summary: string;
    tags: string[];
    content: string;
    last_updated: string;
    is_default: boolean;
}

function fromDatabase(doc: DatabaseDocument): DocumentItem {
    return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        author: doc.author,
        version: doc.version,
        summary: doc.summary,
        tags: doc.tags ?? [],
        content: doc.content,
        lastUpdated: doc.last_updated,
        isDefault: doc.is_default,
        charCount: doc.content.length,
    };
}

export async function listCustomDocuments(): Promise<DocumentItem[]> {
    const result = await request<{ documents: DatabaseDocument[] }>('GET');

    return (result.documents ?? []).map(fromDatabase);
}

export async function saveCustomDocument(
    document: DocumentItem,
): Promise<DocumentItem> {
    const result = await request<{
        success: boolean;
        document: DocumentItem;
    }>('POST', {
        id: document.id,
        title: document.title,
        category: document.category,
        author: document.author,
        version: document.version,
        summary: document.summary,
        tags: document.tags,
        content: document.content,
    });

    return result.document;
}

export async function deleteCustomDocument(id: string): Promise<void> {
    await request<{ success: boolean }>('DELETE', undefined, id);
}
