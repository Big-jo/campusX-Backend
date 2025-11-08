import { CampusRepository } from '../../repositories/CampusRepository';
import { NotFoundError } from '../../errors';

export class CampusService {
  private campusRepository: CampusRepository;

  constructor() {
    this.campusRepository = new CampusRepository();
  }

  /**
   * Get all enabled campuses
   */
  async getAllCampuses() {
    const campuses = await this.campusRepository.getAllCampuses();

    return {
      data: campuses.map(campus => ({
        id: campus._id,
        name: campus.name,
        acronym: campus.acronym,
        motto: campus.motto,
        web: campus.web,
        logo: campus.logo,
        enabled: campus.enabled
      })),
      meta: {
        total: campuses.length
      }
    };
  }

  /**
   * Get campus by ID
   */
  async getCampusById(id: string) {
    const campus = await this.campusRepository.getCampusById(id);

    if (!campus) {
      throw new NotFoundError('Campus not found');
    }

    return {
      data: {
        id: campus._id,
        name: campus.name,
        acronym: campus.acronym,
        motto: campus.motto,
        web: campus.web,
        logo: campus.logo,
        enabled: campus.enabled
      }
    };
  }

  /**
   * Search campuses by query
   */
  async searchCampuses(query: string) {
    const campuses = await this.campusRepository.searchCampuses(query);

    return {
      data: campuses.map(campus => ({
        id: campus._id,
        name: campus.name,
        acronym: campus.acronym,
        motto: campus.motto,
        web: campus.web,
        logo: campus.logo
      })),
      meta: {
        total: campuses.length,
        query
      }
    };
  }
}
