import { Router } from 'express';
import { CampusController } from '../../controllers/v2/campus.controller';
import { validate } from '../../middleware/validation';
import {
  getAllCampusesSchema,
  getCampusByIdSchema,
  searchCampusesSchema
} from '../../validators/v2/campus.validator';

const router = Router();
const campusController = new CampusController();

router.get('/', validate(getAllCampusesSchema), campusController.getAllCampuses);
router.get('/search', validate(searchCampusesSchema), campusController.searchCampuses);
router.get('/:id', validate(getCampusByIdSchema), campusController.getCampusById);

export default router;
