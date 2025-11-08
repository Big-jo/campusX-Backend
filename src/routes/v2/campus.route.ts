import { Router } from 'express';
import { CampusController } from '../../controllers/v2/campus.controller';
import { validate } from '../../middleware/validation';
import {
  getAllCampusesSchema,
  getCampusByIdSchema,
  searchCampusesSchema
} from '../../validators/v2/campus.validator';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
const campusController = new CampusController();

router.get('/', validate(getAllCampusesSchema), asyncHandler(campusController.getAllCampuses));
router.get('/search', validate(searchCampusesSchema), asyncHandler(campusController.searchCampuses));
router.get('/:id', validate(getCampusByIdSchema), asyncHandler(campusController.getCampusById));

export default router;
