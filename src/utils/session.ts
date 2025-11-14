/**
 * Session persistence utilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ClarificationResult, Proposal } from '../types/index.js';

const SESSION_DIR = path.join(os.homedir(), '.dao-code', 'sessions');

/**
 * Ensure session directory exists
 */
async function ensureSessionDir(): Promise<void> {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create session directory:', error);
  }
}

/**
 * Save a clarification result to disk
 */
export async function saveClarificationResult(
  requirement: string,
  result: ClarificationResult
): Promise<string> {
  await ensureSessionDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionName = `clarification-${timestamp}.json`;
  const sessionPath = path.join(SESSION_DIR, sessionName);

  const sessionData = {
    requirement,
    result,
    timestamp: new Date().toISOString(),
    type: 'clarification'
  };

  await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
  return sessionName;
}

/**
 * Save a proposal to disk
 */
export async function saveProposal(proposal: Proposal): Promise<string> {
  await ensureSessionDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionName = `proposal-${timestamp}.json`;
  const sessionPath = path.join(SESSION_DIR, sessionName);

  const sessionData = {
    proposal,
    timestamp: new Date().toISOString(),
    type: 'proposal'
  };

  await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
  return sessionName;
}

/**
 * Load a saved session
 */
export async function loadSession(sessionName: string): Promise<any> {
  const sessionPath = path.join(SESSION_DIR, sessionName);
  const content = await fs.readFile(sessionPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * List all saved sessions
 */
export async function listSessions(): Promise<string[]> {
  await ensureSessionDir();

  try {
    const files = await fs.readdir(SESSION_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    return [];
  }
}

/**
 * List saved proposals only
 */
export async function listProposals(): Promise<string[]> {
  const sessions = await listSessions();
  return sessions.filter(s => s.startsWith('proposal-'));
}

/**
 * List saved clarification results only
 */
export async function listClarifications(): Promise<string[]> {
  const sessions = await listSessions();
  return sessions.filter(s => s.startsWith('clarification-'));
}

/**
 * Delete a session
 */
export async function deleteSession(sessionName: string): Promise<void> {
  const sessionPath = path.join(SESSION_DIR, sessionName);
  await fs.unlink(sessionPath);
}

/**
 * Get session directory path
 */
export function getSessionDir(): string {
  return SESSION_DIR;
}
