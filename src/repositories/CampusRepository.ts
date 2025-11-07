import { BaseRepository } from './BaseRepository';
import CampusModel, { ICampus } from '../models/Campus.model';

export class CampusRepository extends BaseRepository<ICampus> {
  constructor() {
    super(CampusModel);
  }

  /**
   * Get all enabled campuses sorted by name
   */
  async getAllCampuses() {
    return this.find({ enabled: true }, null, { sort: { name: 1 } });
  }

  /**
   * Get campus by ID
   */
  async getCampusById(id: string) {
    return this.findById(id);
  }

  /**
   * Search campuses by name or acronym
   */
  async searchCampuses(query: string) {
    const regex = new RegExp(query, 'i');
    return this.find(
      {
        enabled: true,
        $or: [
          { name: regex },
          { acronym: regex }
        ]
      },
      null,
      { sort: { name: 1 } }
    );
  }

  /**
   * Get campus by acronym
   */
  async getCampusByAcronym(acronym: string) {
    return this.findOne({ acronym, enabled: true });
  }
}
