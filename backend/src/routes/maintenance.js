import { Router } from 'express';
import {
  listMaintenance,
  createMaintenance,
  updateMaintenanceStatus,
  deleteMaintenance
} from '../controllers/maintenanceController.js';

const router = Router();

router.get('/', listMaintenance);
router.post('/', createMaintenance);
router.patch('/:id', updateMaintenanceStatus);
router.delete('/:id', deleteMaintenance);

export default router;
