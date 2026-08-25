import { NextResponse } from 'next/server';

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'ITSM Enterprise SaaS REST API',
      description: 'Enterprise IT Service Management & Operations Platform OpenAPI 3.0 Specification',
      version: '2.1.0',
      contact: {
        name: 'ITSM API Support',
        url: 'https://itsm.antigravity.ai/docs',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Primary Tenant API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Tenant Scoped API Key (ak_live_...)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'TK-2026-0001' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
            status: { type: 'string', enum: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] },
            reporter_name: { type: 'string' },
            reporter_email: { type: 'string' },
            assigned_to: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            asset_tag: { type: 'string' },
            category: { type: 'string' },
            purchase_cost: { type: 'number' },
            status: { type: 'string' },
          },
        },
        Problem: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'PRB-2026-0001' },
            title: { type: 'string' },
            root_cause: { type: 'string' },
            workaround: { type: 'string' },
            solution: { type: 'string' },
            status: { type: 'string' },
          },
        },
        ChangeRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'CR-2026-0001' },
            title: { type: 'string' },
            change_type: { type: 'string', enum: ['Standard', 'Normal', 'Emergency'] },
            risk_level: { type: 'string' },
            status: { type: 'string' },
          },
        },
        KnowledgeArticle: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'KB-2026-0001' },
            title: { type: 'string' },
            summary: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string' },
            visibility: { type: 'string', enum: ['Internal', 'Public'] },
            status: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/tickets': {
        get: {
          summary: 'List Helpdesk Tickets',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Successful ticket list response' } },
        },
        post: {
          summary: 'Create Helpdesk Ticket',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '201': { description: 'Ticket created successfully' } },
        },
      },
      '/assets': {
        get: {
          summary: 'List IT Assets',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Successful asset inventory response' } },
        },
      },
      '/problems': {
        get: {
          summary: 'List ITIL Problems & RCA',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Problems list' } },
        },
      },
      '/changes': {
        get: {
          summary: 'List Change Enablement Requests',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Change requests list' } },
        },
      },
      '/kb': {
        get: {
          summary: 'List Knowledge Base Articles',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: { '200': { description: 'Articles list' } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
