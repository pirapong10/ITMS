import { z } from 'zod';
import { withTenantTransaction } from './db';

// Zod Validation Schemas
export const CreateArticleSchema = z.object({
  title: z.string().min(3).max(255),
  summary: z.string().min(3),
  content: z.string().min(5),
  category: z.string().min(2).max(50).default('General'),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['Internal', 'Public']).default('Internal'),
  status: z.enum(['Draft', 'Under Review', 'Published', 'Archived']).default('Draft'),
  author_id: z.string().optional(),
  author_name: z.string().optional(),
  source_ticket_id: z.string().optional(),
  source_problem_id: z.string().optional(),
});

export const UpdateArticleSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  summary: z.string().min(3).optional(),
  content: z.string().min(5).optional(),
  category: z.string().min(2).max(50).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['Internal', 'Public']).optional(),
  status: z.enum(['Draft', 'Under Review', 'Published', 'Archived']).optional(),
});

export const FeedbackSchema = z.object({
  is_helpful: z.boolean(),
  feedback_text: z.string().optional(),
  user_id: z.string().optional(),
});

export const ConvertTicketSchema = z.object({
  ticket_id: z.string().min(1),
  visibility: z.enum(['Internal', 'Public']).default('Internal'),
  author_id: z.string().optional(),
  author_name: z.string().optional(),
});

export const ConvertProblemSchema = z.object({
  problem_id: z.string().min(1),
  visibility: z.enum(['Internal', 'Public']).default('Internal'),
  author_id: z.string().optional(),
  author_name: z.string().optional(),
});

export type CreateArticleInput = z.input<typeof CreateArticleSchema>;
export type UpdateArticleInput = z.input<typeof UpdateArticleSchema>;
export type FeedbackInput = z.input<typeof FeedbackSchema>;
export type ConvertTicketInput = z.input<typeof ConvertTicketSchema>;
export type ConvertProblemInput = z.input<typeof ConvertProblemSchema>;

export interface KnowledgeArticleRecord {
  id: string;
  tenant_id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  visibility: 'Internal' | 'Public';
  status: 'Draft' | 'Under Review' | 'Published' | 'Archived';
  is_published: boolean;
  author_id: string | null;
  author_name: string | null;
  source_ticket_id: string | null;
  source_problem_id: string | null;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Generates an atomic Knowledge Article ID: KB-YYYY-XXXX (e.g. KB-2026-0001)
 */
export async function generateArticleId(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `KB-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM knowledge_articles WHERE tenant_id = $1 AND id LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Creates a new Knowledge Article.
 */
export async function createArticle(
  tenantId: string,
  input: CreateArticleInput
): Promise<KnowledgeArticleRecord> {
  const validated = CreateArticleSchema.parse(input);
  const now = new Date();
  const isPublished = validated.status === 'Published';
  const publishedAt = isPublished ? now.toISOString() : null;

  return withTenantTransaction(tenantId, async (client) => {
    const id = await generateArticleId(client, tenantId, now.getFullYear());

    const res = await client.query(
      `INSERT INTO knowledge_articles (
        id, tenant_id, title, summary, content, category, tags, visibility,
        status, is_published, author_id, author_name, source_ticket_id,
        source_problem_id, view_count, helpful_count, not_helpful_count,
        created_at, updated_at, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 0, 0, $15, $15, $16)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.title,
        validated.summary,
        validated.content,
        validated.category,
        validated.tags,
        validated.visibility,
        validated.status,
        isPublished,
        validated.author_id || null,
        validated.author_name || null,
        validated.source_ticket_id || null,
        validated.source_problem_id || null,
        now.toISOString(),
        publishedAt,
      ]
    );

    return res.rows[0];
  });
}

/**
 * Retrieves Knowledge Article by ID with optional view count increment.
 */
export async function getArticleById(
  tenantId: string,
  id: string,
  incrementView: boolean = false
): Promise<KnowledgeArticleRecord | null> {
  return withTenantTransaction(tenantId, async (client) => {
    if (incrementView) {
      await client.query(
        `UPDATE knowledge_articles SET view_count = view_count + 1 WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
    }

    const res = await client.query(
      `SELECT * FROM knowledge_articles WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  });
}

/**
 * Lists articles with filtering options.
 */
export async function listArticles(
  tenantId: string,
  filters: {
    status?: string;
    category?: string;
    visibility?: string;
    tag?: string;
    search?: string;
  } = {}
): Promise<KnowledgeArticleRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }
    if (filters.visibility) {
      conditions.push(`visibility = $${paramIndex}`);
      params.push(filters.visibility);
      paramIndex++;
    }
    if (filters.tag) {
      conditions.push(`$${paramIndex} = ANY(tags)`);
      params.push(filters.tag);
      paramIndex++;
    }
    if (filters.search) {
      conditions.push(
        `(title ILIKE $${paramIndex} OR summary ILIKE $${paramIndex} OR content ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM knowledge_articles WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    return res.rows;
  });
}

/**
 * Updates Knowledge Article.
 */
export async function updateArticle(
  tenantId: string,
  id: string,
  input: UpdateArticleInput
): Promise<KnowledgeArticleRecord> {
  const validated = UpdateArticleSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [now.toISOString()];
    let paramIndex = 2;

    if (validated.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(validated.title);
      paramIndex++;
    }
    if (validated.summary !== undefined) {
      updates.push(`summary = $${paramIndex}`);
      values.push(validated.summary);
      paramIndex++;
    }
    if (validated.content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      values.push(validated.content);
      paramIndex++;
    }
    if (validated.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(validated.category);
      paramIndex++;
    }
    if (validated.tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(validated.tags);
      paramIndex++;
    }
    if (validated.visibility !== undefined) {
      updates.push(`visibility = $${paramIndex}`);
      values.push(validated.visibility);
      paramIndex++;
    }
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;

      const isPublished = validated.status === 'Published';
      updates.push(`is_published = $${paramIndex}`);
      values.push(isPublished);
      paramIndex++;

      if (isPublished) {
        updates.push(`published_at = $${paramIndex}`);
        values.push(now.toISOString());
        paramIndex++;
      }
    }

    values.push(id, tenantId);

    const res = await client.query(
      `UPDATE knowledge_articles SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *;`,
      values
    );

    if (res.rows.length === 0) throw new Error('Article not found');
    return res.rows[0];
  });
}

/**
 * Deletes Knowledge Article.
 */
export async function deleteArticle(tenantId: string, id: string): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM knowledge_articles WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    return res.rows.length > 0;
  });
}

/**
 * Converts a Helpdesk Ticket resolution into a structured Draft KB Article (KCS).
 */
export async function convertTicketToArticle(
  tenantId: string,
  input: ConvertTicketInput
): Promise<KnowledgeArticleRecord> {
  const validated = ConvertTicketSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const ticketRes = await client.query(
      `SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`,
      [validated.ticket_id, tenantId]
    );

    if (ticketRes.rows.length === 0) throw new Error('Ticket not found');
    const ticket = ticketRes.rows[0];

    const title = `How to resolve: ${ticket.title}`;
    const summary = ticket.description
      ? ticket.description.substring(0, 180) + '...'
      : `Resolution guide derived from ticket ${ticket.id}`;

    const content = `## Issue Description\n${ticket.description || 'No description provided.'}\n\n## Resolution Steps\n${ticket.resolution_notes || 'Apply standard operational troubleshooting procedures.'}\n\n---\n*Authored from incident ticket [${ticket.id}]*`;

    return createArticle(tenantId, {
      title,
      summary,
      content,
      category: ticket.category || 'General',
      tags: [ticket.category || 'Support', 'Ticket-Derived'],
      visibility: validated.visibility,
      status: 'Draft',
      author_id: validated.author_id,
      author_name: validated.author_name,
      source_ticket_id: ticket.id,
    });
  });
}

/**
 * Converts a Problem RCA into a structured Draft KB Article (KCS).
 */
export async function convertProblemToArticle(
  tenantId: string,
  input: ConvertProblemInput
): Promise<KnowledgeArticleRecord> {
  const validated = ConvertProblemSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const probRes = await client.query(
      `SELECT * FROM problems WHERE id = $1 AND tenant_id = $2`,
      [validated.problem_id, tenantId]
    );

    if (probRes.rows.length === 0) throw new Error('Problem record not found');
    const problem = probRes.rows[0];

    const title = `Troubleshooting & Workaround: ${problem.title}`;
    const summary = problem.description
      ? problem.description.substring(0, 180) + '...'
      : `Technical guidance and root cause analysis for ${problem.id}`;

    const content = `## Problem Overview\n${problem.description}\n\n## Root Cause\n${problem.root_cause || 'Under investigation.'}\n\n## Workaround\n${problem.workaround || 'No temporary workaround available.'}\n\n## Permanent Solution\n${problem.solution || 'See engineering release notes.'}\n\n---\n*Knowledge article generated from Problem Investigation [${problem.id}]*`;

    return createArticle(tenantId, {
      title,
      summary,
      content,
      category: problem.category || 'Infrastructure',
      tags: [problem.category || 'Problem', 'RCA', 'KCS'],
      visibility: validated.visibility,
      status: 'Draft',
      author_id: validated.author_id,
      author_name: validated.author_name,
      source_problem_id: problem.id,
    });
  });
}

/**
 * Records user feedback (Helpful / Unhelpful) for an article.
 */
export async function recordArticleFeedback(
  tenantId: string,
  articleId: string,
  input: FeedbackInput
) {
  const validated = FeedbackSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    await client.query(
      `INSERT INTO knowledge_feedback (
        article_id, tenant_id, user_id, is_helpful, feedback_text, created_at
      ) VALUES ($1, $2, $3, $4, $5, current_timestamp);`,
      [articleId, tenantId, validated.user_id || null, validated.is_helpful, validated.feedback_text || null]
    );

    const countCol = validated.is_helpful ? 'helpful_count' : 'not_helpful_count';
    const res = await client.query(
      `UPDATE knowledge_articles
       SET ${countCol} = ${countCol} + 1
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, title, helpful_count, not_helpful_count;`,
      [articleId, tenantId]
    );

    if (res.rows.length === 0) throw new Error('Article not found');
    return res.rows[0];
  });
}

/**
 * Public Self-Service Knowledge Base Search.
 */
export async function searchSelfServiceKnowledgeBase(
  tenantId: string,
  options: { query?: string; category?: string } = {}
): Promise<KnowledgeArticleRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1', 'is_published = true', "visibility = 'Public'"];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(options.category);
      paramIndex++;
    }
    if (options.query) {
      conditions.push(
        `(title ILIKE $${paramIndex} OR summary ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`
      );
      params.push(`%${options.query}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM knowledge_articles WHERE ${conditions.join(' AND ')} ORDER BY helpful_count DESC, view_count DESC`,
      params
    );

    return res.rows;
  });
}
