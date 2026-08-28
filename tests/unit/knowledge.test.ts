import {
  CreateArticleSchema,
  UpdateArticleSchema,
  FeedbackSchema,
  ConvertTicketSchema,
  ConvertProblemSchema,
  createArticle,
  getArticleById,
  listArticles,
  updateArticle,
  deleteArticle,
  convertTicketToArticle,
  convertProblemToArticle,
  recordArticleFeedback,
  searchSelfServiceKnowledgeBase,
} from '../../src/lib/knowledge';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Knowledge Management & KCS (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate valid Knowledge Article creation payload', () => {
      const payload = {
        title: 'How to Configure GlobalProtect VPN on macOS',
        summary: 'Step-by-step guide for setting up corporate VPN client on macOS Sequoia',
        content: '1. Download client. 2. Enter portal gateway. 3. Authenticate with SSO.',
        category: 'Network',
        tags: ['VPN', 'macOS', 'Remote Access'],
        visibility: 'Public' as const,
        status: 'Published' as const,
      };
      const parsed = CreateArticleSchema.parse(payload);
      expect(parsed.title).toBe('How to Configure GlobalProtect VPN on macOS');
      expect(parsed.visibility).toBe('Public');
      expect(parsed.tags.length).toBe(3);
    });

    it('should validate Article update payload', () => {
      const payload = {
        title: 'Updated VPN Setup Guide',
        status: 'Under Review' as const,
      };
      const parsed = UpdateArticleSchema.parse(payload);
      expect(parsed.title).toBe('Updated VPN Setup Guide');
      expect(parsed.status).toBe('Under Review');
    });

    it('should validate feedback payload', () => {
      const payload = {
        is_helpful: true,
        feedback_text: 'Very clear instructions, solved my issue in 2 minutes!',
      };
      const parsed = FeedbackSchema.parse(payload);
      expect(parsed.is_helpful).toBe(true);
      expect(parsed.feedback_text).toContain('Very clear instructions');
    });

    it('should validate ticket conversion schema', () => {
      const parsed = ConvertTicketSchema.parse({
        ticket_id: 'TK-2026-0001',
        visibility: 'Public',
      });
      expect(parsed.ticket_id).toBe('TK-2026-0001');
      expect(parsed.visibility).toBe('Public');
    });

    it('should validate problem conversion schema', () => {
      const parsed = ConvertProblemSchema.parse({
        problem_id: 'PRB-2026-0001',
        visibility: 'Internal',
      });
      expect(parsed.problem_id).toBe('PRB-2026-0001');
    });
  });

  describe('Article CRUD Operations', () => {
    const tenantId = 'tenant-123';

    it('should create article with generated ID', async () => {
      const mockArticle = {
        id: 'KB-2026-0001',
        title: 'Email Setup',
        status: 'Draft',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [mockArticle] }),
        };
        return cb(client);
      });

      const res = await createArticle(tenantId, {
        title: 'Email Setup',
        summary: 'Setup Outlook',
        content: 'Step 1: Open Outlook',
      });

      expect(res.id).toBe('KB-2026-0001');
    });

    it('should get article by ID with optional view count increment', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // update view count
            .mockResolvedValueOnce({ rows: [{ id: 'KB-1', title: 'Guide' }] }),
        };
        return cb(client);
      });

      const article = await getArticleById(tenantId, 'KB-1', true);
      expect(article?.id).toBe('KB-1');
    });

    it('should list articles with search, category, visibility and tags filter', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'KB-1', title: 'Guide' }] }),
        };
        return cb(client);
      });

      const list = await listArticles(tenantId, {
        status: 'Published',
        category: 'Network',
        visibility: 'Public',
        tag: 'VPN',
        search: 'Guide',
      });
      expect(list.length).toBe(1);
    });

    it('should update all fields and delete article', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'KB-1', title: 'Updated Guide' }] }),
        };
        return cb(client);
      });

      const updated = await updateArticle(tenantId, 'KB-1', {
        title: 'Updated Guide',
        summary: 'Updated Summary',
        content: 'Updated Content',
        category: 'Network',
        tags: ['VPN', 'Remote'],
        visibility: 'Public',
        status: 'Published',
      });
      expect(updated.title).toBe('Updated Guide');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'KB-1' }] }),
        };
        return cb(client);
      });

      const deleted = await deleteArticle(tenantId, 'KB-1');
      expect(deleted).toBe(true);
    });
  });

  describe('KCS Conversions & Feedback', () => {
    const tenantId = 'tenant-123';

    it('should convert resolved ticket into draft article', async () => {
      const mockTicket = {
        id: 'TK-1',
        title: 'Printer Jam',
        description: 'Paper stuck',
        resolution_notes: 'Cleared paper tray',
        category: 'Hardware',
      };
      const mockArticle = { id: 'KB-1', title: 'How to resolve: Printer Jam' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM tickets')) {
              return { rows: [mockTicket] };
            }
            if (sql.includes('SELECT count(*) as count FROM knowledge_articles')) {
              return { rows: [{ count: '0' }] };
            }
            if (sql.includes('INSERT INTO knowledge_articles')) {
              return { rows: [mockArticle] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const article = await convertTicketToArticle(tenantId, {
        ticket_id: 'TK-1',
        visibility: 'Public',
      });
      expect(article.id).toBe('KB-1');
    });

    it('should convert problem into draft article', async () => {
      const mockProblem = {
        id: 'PRB-1',
        title: 'Switch Failure',
        description: 'Overheating',
        root_cause: 'Fan stopped',
        workaround: 'External fan',
        solution: 'Replaced fan',
        category: 'Network',
      };
      const mockArticle = { id: 'KB-2', title: 'Troubleshooting & Workaround: Switch Failure' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM problems')) {
              return { rows: [mockProblem] };
            }
            if (sql.includes('SELECT count(*) as count FROM knowledge_articles')) {
              return { rows: [{ count: '0' }] };
            }
            if (sql.includes('INSERT INTO knowledge_articles')) {
              return { rows: [mockArticle] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const article = await convertProblemToArticle(tenantId, {
        problem_id: 'PRB-1',
        visibility: 'Internal',
      });
      expect(article.id).toBe('KB-2');
    });

    it('should record article feedback and increment count', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // insert feedback
            .mockResolvedValueOnce({ rows: [{ id: 'KB-1', helpful_count: 5 }] }), // update count
        };
        return cb(client);
      });

      const res = await recordArticleFeedback(tenantId, 'KB-1', { is_helpful: true });
      expect(res.helpful_count).toBe(5);
    });

    it('should search public self-service knowledge base', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'KB-1', title: 'VPN Guide' }] }),
        };
        return cb(client);
      });

      const articles = await searchSelfServiceKnowledgeBase(tenantId, { query: 'VPN', category: 'Network' });
      expect(articles.length).toBe(1);
    });
  });
});
