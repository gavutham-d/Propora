import { Router } from 'express';
import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty
} from '../controllers/propertiesController.js';

const router = Router();

router.get('/', listProperties);
router.post('/', createProperty);
router.get('/:id', getProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);

export default router;
