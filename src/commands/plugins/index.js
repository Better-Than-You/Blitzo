// Importing and exporting all plugin-related commands
import { coreCommands } from './core.js';
import { groupCommands } from './group.js';
import { developmentCommands } from './development.js';
import { moderationCommands } from './moderation.js';

export const pluginCommands = {
    ...coreCommands,
    ...groupCommands,
    ...developmentCommands,
    ...moderationCommands
};