import { BaseRepository } from './BaseRepository';
import InterestCategoryModel, { IInterestCategory } from '../models/Interest.model';

export class InterestRepository extends BaseRepository<IInterestCategory> {
  constructor() {
    super(InterestCategoryModel);
  }

  async getAllCategories() {
    return this.find({}, null, { sort: { displayOrder: 1 } });
  }

  async getCategoryById(id: string) {
    return this.findOne({ id });
  }
}
