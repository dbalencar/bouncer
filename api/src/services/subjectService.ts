import { query } from '../config/database';
import { Subject } from '../types';

export const getAllSubjects = async (): Promise<Subject[]> => {
  const result = await query('SELECT * FROM common.subjects ORDER BY username');
  return result.rows;
};

export const getSubjectByUid = async (uid: string): Promise<Subject | null> => {
  const result = await query('SELECT * FROM common.subjects WHERE uid = $1', [uid]);
  return result.rows[0] || null;
};

export const getSubjectByUsername = async (username: string): Promise<Subject | null> => {
  const result = await query('SELECT * FROM common.subjects WHERE username = $1', [username]);
  return result.rows[0] || null;
};

export const createSubject = async (username: string, name: string, email: string): Promise<Subject> => {
  const result = await query(
    'INSERT INTO common.subjects (username, name, email) VALUES ($1, $2, $3) RETURNING *',
    [username, name, email]
  );
  return result.rows[0];
};
