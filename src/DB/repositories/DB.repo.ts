import { HydratedDocument, Model, ProjectionType, QueryFilter, Types, UpdateQuery, UpdateWriteOpResult } from "mongoose";

export abstract class DBRepo<T> {
    constructor(protected readonly model: Model<T>) { }

    async create(data: Partial<T>, options?: any): Promise<HydratedDocument<T>> {
        const docs = new this.model(data);
        await docs.save(options);
        return docs as HydratedDocument<T>;
    }

    async findOne(filter: QueryFilter<T>, select?: ProjectionType<T>): Promise<HydratedDocument<T> | null> {
        return this.model.findOne(filter, select);
    }

    async findOneLean(filter: QueryFilter<T>, select?: ProjectionType<T>): Promise<T | null> {
        return this.model.findOne(filter, select).lean() as Promise<T | null>;
    }

    async find(filter: QueryFilter<T>, select?: ProjectionType<T>, options?: any): Promise<HydratedDocument<T>[]> {
        return this.model.find(filter, select, options) as any;
    }

    async findLean(filter: QueryFilter<T>, select?: ProjectionType<T>, options?: any): Promise<T[]> {
        return this.model.find(filter, select, options).lean() as Promise<T[]>;
    }

    async findById(id: string | Types.ObjectId, select?: ProjectionType<T>): Promise<HydratedDocument<T> | null> {
        return this.model.findById(id, select);
    }

    async findByIdLean(id: string | Types.ObjectId, select?: ProjectionType<T>): Promise<T | null> {
        return this.model.findById(id, select).lean() as Promise<T | null>;
    }

    async updateOne(filter: QueryFilter<T>, update: UpdateQuery<T>, options?: any): Promise<UpdateWriteOpResult> {
        return this.model.updateOne(filter, update, options);
    }

    async updateMany(filter: QueryFilter<T>, update: UpdateQuery<T>, options?: any): Promise<any> {
        return this.model.updateMany(filter, update, options);
    }

}