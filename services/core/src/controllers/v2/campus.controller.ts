import { Request, Response } from 'express';
import { CampusService } from '../../services/v2/campus.service';
import { BadRequestError } from '../../errors';

export class CampusController {
  private campusService: CampusService;

  constructor() {
    this.campusService = new CampusService();
  }

  /**
   * GET /api/v2/campus
   * Get all enabled campuses
   */
  getAllCampuses = async (req: Request, res: Response) => {
    const result = await this.campusService.getAllCampuses();
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/campus/:id
   * Get campus by ID
   */
  getCampusById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.campusService.getCampusById(id);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/campus/search?q=query
   * Search campuses by name or acronym
   */
  searchCampuses = async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      throw new BadRequestError('Query parameter "q" is required');
    }

    const result = await this.campusService.searchCampuses(q);
    return res.status(200).json(result);
  };
}
