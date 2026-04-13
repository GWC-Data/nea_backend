const dotenv = require('dotenv');
dotenv.config();

if (process.env.DB_MIGRATIONS_DIR && __dirname.includes('dist')) {
  process.env.DB_MIGRATIONS_DIR = process.env.DB_MIGRATIONS_DIR.replace(/^src\//, 'dist/');
}