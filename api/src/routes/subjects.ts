import { Router, Request, Response } from 'express';
import {
  getAllSubjects,
  getSubjectByUid,
  getSubjectByUsername
} from '../services/subjectService';

const router = Router();

// GET /subjects - Get all subjects
router.get('/', async (req: Request, res: Response) => {
  try {
    const subjects = await getAllSubjects();
    res.json(subjects);
  } catch (error) {
    console.error('Error getting subjects:', error);
    res.status(500).json({ error: 'Failed to get subjects' });
  }
});

// GET /subjects/:uid - Get subject by UID
router.get('/:uid', async (req: Request, res: Response) => {
  try {
    const subject = await getSubjectByUid(req.params.uid);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    console.error('Error getting subject:', error);
    res.status(500).json({ error: 'Failed to get subject' });
  }
});

// GET /subjects/username/:username - Get subject by username
router.get('/username/:username', async (req: Request, res: Response) => {
  try {
    const subject = await getSubjectByUsername(req.params.username);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    console.error('Error getting subject by username:', error);
    res.status(500).json({ error: 'Failed to get subject' });
  }
});

export default router;
