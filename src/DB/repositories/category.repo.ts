import { HydratedDocument, Model, UpdateWriteOpResult } from "mongoose";
import { ICategory } from "../model/category.model";
import { DBRepo } from "./DB.repo";

export class CategoryRepo extends DBRepo<ICategory> {
    constructor(protected readonly model: Model<ICategory>) {
        super(model);
    }

    async createCategory(data: Partial<ICategory>): Promise<HydratedDocument<ICategory>> {
        const category = await this.model.create(data);
        if (!category) {
            throw new Error("category not created");
        }
        return category;
    }

    async findAll(
        filter: Record<string, any>,
        page: number = 1,
        limit: number = 20
    ): Promise<{ categories: any[]; total: number }> {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const skip = (Math.max(page, 1) - 1) * safeLimit;

        const [categories, total] = await Promise.all([
            this.model.aggregate([
                { $match: { isDeleted: false, ...filter } },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "category",
                        as: "products",
                        pipeline: [{ $match: { isDeleted: false } }]
                    }
                },
                {
                    $addFields: {
                        productCount: { $size: "$products" }
                    }
                },
                { $project: { products: 0, __v: 0 } },
                { $sort: { displayOrder: 1, createdAt: -1 } },
                { $skip: skip },
                { $limit: safeLimit }
            ]),
            this.model.countDocuments({ isDeleted: false, ...filter })
        ]);

        return { categories, total };
    }

    async findByIdWithProducts(id: string): Promise<any> {
        const result = await this.model.aggregate([
            { $match: { _id: new (await import("mongoose")).Types.ObjectId(id), isDeleted: false } },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "category",
                    as: "products",
                    pipeline: [
                        { $match: { isDeleted: false } },
                        { $project: { __v: 0, isDeleted: 0 } },
                        { $sort: { createdAt: -1 as 1 | -1 } }
                    ]
                }
            },
            {
                $addFields: {
                    productCount: { $size: "$products" }
                }
            },
            { $project: { __v: 0 } }
        ]);

        return result.length ? result[0] : null;
    }

    async hardDelete(id: string): Promise<void> {
        await this.model.deleteOne({ _id: id });
    }
}
 