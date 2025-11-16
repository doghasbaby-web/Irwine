/**
 * Enhanced session management system
 * Provides better persistence, metadata, search, and recovery capabilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ClarificationResult, Proposal } from '../types/index.js';
import { SessionError } from './errors.js';
import { logger } from './logger.js';

export interface SessionMetadata {
  id: string;
  type: 'clarification' | 'proposal' | 'coding';
  title: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  requirementSummary?: string;
}

export interface ClarificationSession {
  id: string;
  type: 'clarification';
  requirement: string;
  result: ClarificationResult;
  metadata: SessionMetadata;
  timestamp: string;
}

export interface ProposalSession {
  id: string;
  type: 'proposal';
  proposal: Proposal;
  metadata: SessionMetadata;
  timestamp: string;
  source?: string; // ID of clarification session if derived from one
}

export interface CodingSession {
  id: string;
  type: 'coding';
  proposalId: string;
  code: string;
  iterations: any[];
  metadata: SessionMetadata;
  timestamp: string;
}

export type SessionData = ClarificationSession | ProposalSession | CodingSession;

export interface SessionSearchOptions {
  type?: 'clarification' | 'proposal' | 'coding';
  tags?: string[];
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export class SessionManager {
  private static instance: SessionManager;
  private sessionDir: string;
  private metadataCache: Map<string, SessionMetadata> = new Map();

  private constructor() {
    this.sessionDir = path.join(os.homedir(), '.dao-code', 'sessions');
    this.initializeSessionDir();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize session directory
   */
  private async initializeSessionDir(): Promise<void> {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
      logger.debug('Session directory initialized', { path: this.sessionDir });
    } catch (error) {
      logger.error('Failed to create session directory', error as Error);
      throw new SessionError('Failed to initialize session directory');
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Get session file path
   */
  private getSessionPath(sessionId: string): string {
    return path.join(this.sessionDir, `${sessionId}.json`);
  }

  /**
   * Save clarification result
   */
  async saveClarification(
    requirement: string,
    result: ClarificationResult,
    options?: {
      title?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<string> {
    await this.initializeSessionDir();

    const id = this.generateSessionId('clarification');
    const timestamp = new Date().toISOString();

    // Create summary from first proposal
    const requirementSummary = requirement.length > 100
      ? requirement.substring(0, 100) + '...'
      : requirement;

    const metadata: SessionMetadata = {
      id,
      type: 'clarification',
      title: options?.title || `Clarification: ${requirementSummary}`,
      description: options?.description,
      tags: options?.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      fileSize: 0,
      requirementSummary
    };

    const session: ClarificationSession = {
      id,
      type: 'clarification',
      requirement,
      result,
      metadata,
      timestamp
    };

    const sessionPath = this.getSessionPath(id);
    const content = JSON.stringify(session, null, 2);

    await fs.writeFile(sessionPath, content, 'utf-8');

    // Update metadata cache
    metadata.fileSize = Buffer.byteLength(content, 'utf-8');
    this.metadataCache.set(id, metadata);

    logger.info('Clarification session saved', { id, requirement: requirementSummary });

    return id;
  }

  /**
   * Save proposal
   */
  async saveProposal(
    proposal: Proposal,
    options?: {
      title?: string;
      description?: string;
      tags?: string[];
      sourceSessionId?: string;
    }
  ): Promise<string> {
    await this.initializeSessionDir();

    const id = this.generateSessionId('proposal');
    const timestamp = new Date().toISOString();

    const metadata: SessionMetadata = {
      id,
      type: 'proposal',
      title: options?.title || proposal.title,
      description: options?.description || proposal.description,
      tags: options?.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      fileSize: 0
    };

    const session: ProposalSession = {
      id,
      type: 'proposal',
      proposal,
      metadata,
      timestamp,
      source: options?.sourceSessionId
    };

    const sessionPath = this.getSessionPath(id);
    const content = JSON.stringify(session, null, 2);

    await fs.writeFile(sessionPath, content, 'utf-8');

    metadata.fileSize = Buffer.byteLength(content, 'utf-8');
    this.metadataCache.set(id, metadata);

    logger.info('Proposal session saved', { id, title: proposal.title });

    return id;
  }

  /**
   * Save coding session
   */
  async saveCoding(
    proposalId: string,
    code: string,
    iterations: any[],
    options?: {
      title?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<string> {
    await this.initializeSessionDir();

    const id = this.generateSessionId('coding');
    const timestamp = new Date().toISOString();

    const metadata: SessionMetadata = {
      id,
      type: 'coding',
      title: options?.title || `Coding Session`,
      description: options?.description,
      tags: options?.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      fileSize: 0
    };

    const session: CodingSession = {
      id,
      type: 'coding',
      proposalId,
      code,
      iterations,
      metadata,
      timestamp
    };

    const sessionPath = this.getSessionPath(id);
    const content = JSON.stringify(session, null, 2);

    await fs.writeFile(sessionPath, content, 'utf-8');

    metadata.fileSize = Buffer.byteLength(content, 'utf-8');
    this.metadataCache.set(id, metadata);

    logger.info('Coding session saved', { id, proposalId });

    return id;
  }

  /**
   * Load session by ID
   */
  async loadSession(sessionId: string): Promise<SessionData> {
    const sessionPath = this.getSessionPath(sessionId);

    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(content) as SessionData;

      logger.debug('Session loaded', { id: sessionId, type: session.type });

      return session;
    } catch (error) {
      logger.error('Failed to load session', error as Error, { sessionId });
      throw new SessionError(`Failed to load session: ${sessionId}`);
    }
  }

  /**
   * List all sessions with metadata
   */
  async listSessions(options: SessionSearchOptions = {}): Promise<SessionMetadata[]> {
    await this.initializeSessionDir();

    try {
      const files = await fs.readdir(this.sessionDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      // Load metadata for all sessions
      const metadataList: SessionMetadata[] = [];

      for (const file of jsonFiles) {
        const sessionId = file.replace('.json', '');

        // Check cache first
        if (this.metadataCache.has(sessionId)) {
          metadataList.push(this.metadataCache.get(sessionId)!);
        } else {
          // Load from file
          try {
            const session = await this.loadSession(sessionId);
            metadataList.push(session.metadata);
            this.metadataCache.set(sessionId, session.metadata);
          } catch (error) {
            logger.warn('Failed to load session metadata', { sessionId });
          }
        }
      }

      // Apply filters
      let filtered = metadataList;

      if (options.type) {
        filtered = filtered.filter(m => m.type === options.type);
      }

      if (options.tags && options.tags.length > 0) {
        filtered = filtered.filter(m =>
          options.tags!.some(tag => m.tags?.includes(tag))
        );
      }

      if (options.searchTerm) {
        const term = options.searchTerm.toLowerCase();
        filtered = filtered.filter(m =>
          m.title.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term) ||
          m.requirementSummary?.toLowerCase().includes(term)
        );
      }

      if (options.startDate) {
        filtered = filtered.filter(m =>
          new Date(m.createdAt) >= options.startDate!
        );
      }

      if (options.endDate) {
        filtered = filtered.filter(m =>
          new Date(m.createdAt) <= options.endDate!
        );
      }

      // Sort
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';

      filtered.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      // Apply limit
      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    } catch (error) {
      logger.error('Failed to list sessions', error as Error);
      return [];
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessionPath = this.getSessionPath(sessionId);

    try {
      await fs.unlink(sessionPath);
      this.metadataCache.delete(sessionId);

      logger.info('Session deleted', { id: sessionId });
    } catch (error) {
      logger.error('Failed to delete session', error as Error, { sessionId });
      throw new SessionError(`Failed to delete session: ${sessionId}`);
    }
  }

  /**
   * Update session metadata
   */
  async updateMetadata(
    sessionId: string,
    updates: Partial<Pick<SessionMetadata, 'title' | 'description' | 'tags'>>
  ): Promise<void> {
    const session = await this.loadSession(sessionId);

    // Update metadata
    session.metadata = {
      ...session.metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save back to file
    const sessionPath = this.getSessionPath(sessionId);
    const content = JSON.stringify(session, null, 2);

    await fs.writeFile(sessionPath, content, 'utf-8');

    // Update cache
    this.metadataCache.set(sessionId, session.metadata);

    logger.info('Session metadata updated', { id: sessionId });
  }

  /**
   * Get session statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSize: number;
    oldestSession: string;
    newestSession: string;
  }> {
    const sessions = await this.listSessions();

    const stats = {
      total: sessions.length,
      byType: {
        clarification: 0,
        proposal: 0,
        coding: 0
      },
      totalSize: 0,
      oldestSession: '',
      newestSession: ''
    };

    for (const session of sessions) {
      stats.byType[session.type]++;
      stats.totalSize += session.fileSize;
    }

    if (sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      stats.oldestSession = sorted[0].createdAt;
      stats.newestSession = sorted[sorted.length - 1].createdAt;
    }

    return stats;
  }

  /**
   * Clean old sessions
   */
  async cleanOldSessions(daysToKeep: number = 30): Promise<number> {
    const sessions = await this.listSessions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deleted = 0;

    for (const session of sessions) {
      if (new Date(session.createdAt) < cutoffDate) {
        await this.deleteSession(session.id);
        deleted++;
      }
    }

    logger.info('Old sessions cleaned', { deleted, daysToKeep });

    return deleted;
  }

  /**
   * Export session to external format
   */
  async exportSession(sessionId: string, format: 'json' | 'markdown'): Promise<string> {
    const session = await this.loadSession(sessionId);

    if (format === 'json') {
      return JSON.stringify(session, null, 2);
    }

    // Markdown format
    let markdown = `# ${session.metadata.title}\n\n`;
    markdown += `**Type:** ${session.type}\n`;
    markdown += `**Created:** ${session.metadata.createdAt}\n`;

    if (session.metadata.description) {
      markdown += `**Description:** ${session.metadata.description}\n`;
    }

    if (session.metadata.tags && session.metadata.tags.length > 0) {
      markdown += `**Tags:** ${session.metadata.tags.join(', ')}\n`;
    }

    markdown += '\n---\n\n';

    if (session.type === 'clarification') {
      markdown += `## Requirement\n\n${session.requirement}\n\n`;
      markdown += `## Proposals\n\n`;
      session.result.proposals.forEach((p, i) => {
        markdown += `### ${i + 1}. ${p.title}\n\n`;
        markdown += `${p.description}\n\n`;
      });
    } else if (session.type === 'proposal') {
      markdown += `## Proposal: ${session.proposal.title}\n\n`;
      markdown += `${session.proposal.description}\n\n`;
      if (session.proposal.technicalApproach) {
        markdown += `### Technical Approach\n\n${session.proposal.technicalApproach}\n\n`;
      }
    } else if (session.type === 'coding') {
      markdown += `## Code\n\n\`\`\`\n${session.code}\n\`\`\`\n\n`;
    }

    return markdown;
  }

  /**
   * Get session directory path
   */
  getSessionDir(): string {
    return this.sessionDir;
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
