import { DatabaseWrapper } from '../db/db.js';

declare global {
  namespace Express {
    interface Request {
      db: DatabaseWrapper;
    }
  }
}