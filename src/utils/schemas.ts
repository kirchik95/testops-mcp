import { z } from 'zod/v4';
import { config } from '../config.js';

export const projectIdSchema = config.projectId
  ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
  : z.number().describe('Project ID (required)');
