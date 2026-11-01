import { runMigrations } from '../migrations';
import { requireDatabaseUrl } from './script-env';

await runMigrations(requireDatabaseUrl());
console.log('✔ Migrations applied');
