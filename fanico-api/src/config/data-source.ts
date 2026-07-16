import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load .env for the TypeORM CLI (migration:generate/run/revert) which runs
// outside the Nest DI container.
loadEnv();

const isProd = process.env.NODE_ENV === 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // never true — migrations from day one (spec §1.3)
  // src-based globs so the CLI resolves entities/migrations under ts-node.
  // Runtime (AppModule) uses autoLoadEntities instead.
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  logging: isProd ? ['error', 'warn'] : ['query', 'error'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
