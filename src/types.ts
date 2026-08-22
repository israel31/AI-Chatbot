export interface DocumentItem {
  id: string;
  title: string;
  category: 'HR & Benefits' | 'Security & Compliance' | 'Engineering' | 'Finance & Travel' | 'Operations' | 'Product' | 'Custom';
  lastUpdated: string;
  version: string;
  author: string;
  summary: string;
  content: string;
  tags: string[];
  isDefault?: boolean;
  charCount?: number;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  sectionHeading: string;
  exactQuote: string;
  relevanceScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status: 'grounded' | 'not_found' | 'error';
  citations?: Citation[];
  searchedDocs?: string[];
  gapAnalysis?: string;
  confidenceScore?: number;
  filteredDocIds?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  selectedDocIds: string[];
}

export interface QueryResponsePayload {
  answer: string;
  isGrounded: boolean;
  confidence: number;
  citations: Citation[];
  searchedDocs: string[];
  gapAnalysis?: string;
}

export interface DocGapReport {
  id: string;
  query: string;
  timestamp: string;
  searchedDocCount: number;
  notes?: string;
  status: 'pending' | 'resolved';
}
