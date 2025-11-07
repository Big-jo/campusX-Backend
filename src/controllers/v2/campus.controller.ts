import { Request, Response } from 'express';
import { CampusService } from '../../services/v2/campus.service';

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
    try {
      const result = await this.campusService.getAllCampuses();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching campuses:', error);
      return res.status(500).json({
        error: 'Failed to fetch campuses',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/v2/campus/:id
   * Get campus by ID
   */
  getCampusById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.campusService.getCampusById(id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching campus:', error);

      if (error instanceof Error && error.message === 'Campus not found') {
        return res.status(404).json({
          error: 'Campus not found',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch campus',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/v2/campus/search?q=query
   * Search campuses by name or acronym
   */
  searchCampuses = async (req: Request, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'Invalid query parameter',
          message: 'Query parameter "q" is required'
        });
      }

      const result = await this.campusService.searchCampuses(q);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error searching campuses:', error);
      return res.status(500).json({
        error: 'Failed to search campuses',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
