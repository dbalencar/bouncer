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

export const getSubjectByOidcSub = async (oidcSub: string): Promise<Subject | null> => {
  const result = await query('SELECT * FROM common.subjects WHERE oidc_sub = $1', [oidcSub]);
  return result.rows[0] || null;
};

export const setSubjectOidcSub = async (uid: string, oidcSub: string): Promise<Subject> => {
  const result = await query(
    'UPDATE common.subjects SET oidc_sub = $1, updated_at = CURRENT_TIMESTAMP WHERE uid = $2 RETURNING *',
    [oidcSub, uid]
  );
  return result.rows[0];
};

export const createSubjectWithOidc = async (
  username: string,
  name: string,
  email: string,
  oidcSub: string
): Promise<Subject> => {
  const result = await query(
    'INSERT INTO common.subjects (username, name, email, oidc_sub) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, name, email, oidcSub]
  );
  return result.rows[0];
};
