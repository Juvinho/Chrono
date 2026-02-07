import { Router } from 'express';
import {
  getUserTags,
  getTagDefinitions,
  addUserTag,
  removeUserTag,
  getTagsByCategory,
  getTagStatistics,
  updateTagDefinition
} from '../controllers/tagsController.js';

const router = Router();

// Public routes
router.get('/definitions', getTagDefinitions);
router.get('/definitions/category/:categoria', getTagsByCategory);
router.get('/user/:userId', getUserTags);

// Admin routes
router.post('/admin/add', addUserTag);
router.post('/admin/remove', removeUserTag);
router.get('/admin/statistics', getTagStatistics);
router.put('/admin/definitions/:tagId', updateTagDefinition);

export default router;
