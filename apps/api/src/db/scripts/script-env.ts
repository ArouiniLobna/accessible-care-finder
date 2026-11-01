export function requireDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }
  return url;
}

export function refuseInProduction(action: string): void {
  if (process.env['NODE_ENV'] === 'production') {
    console.error(`Refusing to ${action} with NODE_ENV=production.`);
    process.exit(1);
  }
}
