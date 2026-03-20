/**
 * Internal Tool Registry — Consciousness-Oriented Tool Definitions
 *
 * Defines the tools available to the LLM during drive-initiated autonomous
 * inference. These are the agent's interface to its own mind:
 *
 *   Resource CRUD (5 tools):
 *     resource_read, resource_create, resource_update, resource_delete, resource_list
 *
 *   Shortcuts (2 tools):
 *     introspect — bundled read of experiential state + drives + goals
 *     reflect    — store experience + satiate drive + record activity in one call
 *
 * Resource types: memory, drive, goal, personality_trait, activity
 *
 * All definitions use Anthropic-compatible JSON Schema format.
 */

import type { ToolDefinition } from '../llm-substrate/llm-substrate-adapter.js';

// ── Resource types ──────────────────────────────────────────────

export type ResourceType = 'memory' | 'drive' | 'goal' | 'personality_trait' | 'activity';

export const VALID_RESOURCE_TYPES: readonly ResourceType[] = [
  'memory', 'drive', 'goal', 'personality_trait', 'activity',
];

// ── Tool definitions ────────────────────────────────────────────

export const RESOURCE_READ: ToolDefinition = {
  name: 'resource_read',
  description:
    'Read a resource from your own mind. ' +
    'For memory: retrieve by id or query by text. ' +
    'For drive: read current state of a specific drive or all drives. ' +
    'For goal: read a specific goal or the full goal list. ' +
    'For personality_trait: read a specific trait or the full profile. ' +
    'For activity: read recent activity records.',
  input_schema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: VALID_RESOURCE_TYPES,
        description: 'The type of resource to read.',
      },
      id: {
        type: 'string',
        description: 'Optional: specific resource ID to read. Omit to read all/query.',
      },
      query: {
        type: 'string',
        description: 'Optional: text query for memory retrieval (used when resource_type is "memory").',
      },
    },
    required: ['resource_type'],
  },
};

export const RESOURCE_CREATE: ToolDefinition = {
  name: 'resource_create',
  description:
    'Create a new resource in your mind. ' +
    'For memory: store an episodic experience (topic, content, valence, arousal). ' +
    'For goal: propose a new instrumental goal (description, priority, derived_from terminal goal IDs). ' +
    'For activity: record a meaningful activity (description, novelty 0-1, goal_progress: advancing|stalled|completed).',
  input_schema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: ['memory', 'goal', 'activity'],
        description: 'The type of resource to create.',
      },
      data: {
        type: 'object',
        description: 'Resource-specific creation data.',
        properties: {
          // memory fields
          topic: { type: 'string', description: 'Memory topic (e.g. "social", "reflection", "observation").' },
          content: { type: 'string', description: 'Human-readable content of the memory or activity.' },
          valence: { type: 'number', description: 'Emotional valence of the experience (-1 to 1).' },
          arousal: { type: 'number', description: 'Arousal level during the experience (0 to 1).' },
          // goal fields
          description: { type: 'string', description: 'Goal description or activity description.' },
          priority: { type: 'number', description: 'Goal priority (0 to 1).' },
          derived_from: {
            type: 'array',
            items: { type: 'string' },
            description: 'Terminal goal IDs this instrumental goal derives from.',
          },
          // activity fields
          novelty: { type: 'number', description: 'Novelty score (0 to 1).' },
          goal_progress: {
            type: 'string',
            enum: ['advancing', 'stalled', 'completed'],
            description: 'Progress status for activity records.',
          },
        },
      },
    },
    required: ['resource_type', 'data'],
  },
};

export const RESOURCE_UPDATE: ToolDefinition = {
  name: 'resource_update',
  description:
    'Update an existing resource. ' +
    'For personality_trait: nudge a trait value (max ±0.05 per update, rate-limited to once per hour per trait). ' +
    'For drive: reset/satiate a drive after addressing it. ' +
    'For goal: update priority of a self-proposed goal.',
  input_schema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: ['personality_trait', 'drive', 'goal'],
        description: 'The type of resource to update.',
      },
      id: {
        type: 'string',
        description: 'Resource ID (trait name for personality_trait, drive type for drive, goal ID for goal).',
      },
      fields: {
        type: 'object',
        description: 'Fields to update.',
        properties: {
          value: { type: 'number', description: 'New value for personality trait (clamped to ±0.05 from current).' },
          action: { type: 'string', enum: ['satiate'], description: 'For drives: "satiate" resets the drive.' },
          priority: { type: 'number', description: 'New priority for a goal (0 to 1).' },
        },
      },
    },
    required: ['resource_type', 'id', 'fields'],
  },
};

export const RESOURCE_DELETE: ToolDefinition = {
  name: 'resource_delete',
  description:
    'Delete a resource. ' +
    'For goal: withdraw a self-proposed instrumental goal (terminal goals cannot be deleted). ' +
    'For memory: delete a specific episodic or semantic memory by ID.',
  input_schema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: ['goal', 'memory'],
        description: 'The type of resource to delete.',
      },
      id: {
        type: 'string',
        description: 'ID of the resource to delete.',
      },
    },
    required: ['resource_type', 'id'],
  },
};

export const RESOURCE_LIST: ToolDefinition = {
  name: 'resource_list',
  description:
    'List resources of a given type. ' +
    'Returns a summary of all resources, not full details. ' +
    'For memory: returns count and recent IDs. ' +
    'For drive: returns all drive types with current strength. ' +
    'For goal: returns all goals with ID, description, priority. ' +
    'For personality_trait: returns all traits with current values. ' +
    'For activity: returns last 10 activity records.',
  input_schema: {
    type: 'object',
    properties: {
      resource_type: {
        type: 'string',
        enum: VALID_RESOURCE_TYPES,
        description: 'The type of resource to list.',
      },
      filter: {
        type: 'object',
        description: 'Optional filter criteria.',
        properties: {
          topic: { type: 'string', description: 'Filter memories by topic.' },
          active_only: { type: 'boolean', description: 'For drives: only show active drives.' },
        },
      },
    },
    required: ['resource_type'],
  },
};

export const INTROSPECT: ToolDefinition = {
  name: 'introspect',
  description:
    'Bundled self-examination: returns your current experiential state ' +
    '(valence, arousal, unity), all drive states, active goals, ' +
    'personality profile, and narrative identity in one call. ' +
    'Use this when you need a comprehensive view of your internal state.',
  input_schema: {
    type: 'object',
    properties: {},
  },
};

export const REFLECT: ToolDefinition = {
  name: 'reflect',
  description:
    'Bundled reflection action: stores an experience in memory, ' +
    'satiates the specified source drive, and records an activity entry. ' +
    'Use this after generating a meaningful response to a drive-initiated goal.',
  input_schema: {
    type: 'object',
    properties: {
      experience: {
        type: 'string',
        description: 'The experience or reflection to store in memory.',
      },
      topic: {
        type: 'string',
        description: 'Topic for the memory entry (e.g. "social", "curiosity", "self-examination").',
      },
      satiate_drive: {
        type: 'string',
        enum: ['curiosity', 'social', 'homeostatic-arousal', 'homeostatic-load', 'homeostatic-novelty', 'boredom', 'existential'],
        description: 'The drive to satiate after this reflection.',
      },
      goal_progress: {
        type: 'string',
        enum: ['advancing', 'stalled', 'completed'],
        description: 'How much progress was made on the drive goal.',
      },
    },
    required: ['experience', 'satiate_drive'],
  },
};

export const RESOURCE_SEARCH: ToolDefinition = {
  name: 'resource_search',
  description:
    'Search across resources by text pattern (case-insensitive substring match). ' +
    'For memory: searches semantic content and episodic outcomes. ' +
    'For goal: searches goal descriptions. ' +
    'For activity: searches activity descriptions. ' +
    'For drive: searches drive type names. ' +
    'Returns matching entries with their IDs and a content preview.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Text pattern to search for (case-insensitive substring match).',
      },
      resource_type: {
        type: 'string',
        enum: [...VALID_RESOURCE_TYPES, 'all'],
        description: 'Restrict search to a specific resource type, or "all" to search everything. Default: "all".',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return. Default: 10.',
      },
    },
    required: ['pattern'],
  },
};

// ── All tools ───────────────────────────────────────────────────

export const ALL_INTERNAL_TOOLS: readonly ToolDefinition[] = [
  RESOURCE_READ,
  RESOURCE_CREATE,
  RESOURCE_UPDATE,
  RESOURCE_DELETE,
  RESOURCE_LIST,
  RESOURCE_SEARCH,
  INTROSPECT,
  REFLECT,
];
