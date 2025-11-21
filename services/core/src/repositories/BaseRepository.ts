import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Find a single document matching the filter
   */
  async findOne(filter: FilterQuery<T>, projection?: any, options?: QueryOptions): Promise<T | null> {
    return this.model.findOne(filter, projection, options).exec();
  }

  /**
   * Find a document by ID
   */
  async findById(id: string, projection?: any, options?: QueryOptions): Promise<T | null> {
    return this.model.findById(id, projection, options).exec();
  }

  /**
   * Find multiple documents matching the filter
   */
  async find(filter: FilterQuery<T>, projection?: any, options?: QueryOptions): Promise<T[]> {
    return this.model.find(filter, projection, options).exec();
  }

  /**
   * Find all documents (no filter)
   */
  async findAll(projection?: any, options?: QueryOptions): Promise<T[]> {
    return this.model.find({}, projection, options).exec();
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  /**
   * Update a single document matching the filter
   */
  async updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true, ...options }).exec();
  }

  /**
   * Update a document by ID
   */
  async updateById(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true, ...options }).exec();
  }

  /**
   * Update multiple documents
   */
  async updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions) {
    return this.model.updateMany(filter, update, options).exec();
  }

  /**
   * Delete a single document matching the filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOneAndDelete(filter).exec();
  }

  /**
   * Delete a document by ID
   */
  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: FilterQuery<T>) {
    return this.model.deleteMany(filter).exec();
  }

  /**
   * Count documents matching the filter
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Check if a document exists matching the filter
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter).limit(1).exec();
    return count > 0;
  }

  /**
   * Run aggregation pipeline
   */
  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
