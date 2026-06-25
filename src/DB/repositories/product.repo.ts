import { HydratedDocument, Model, ProjectionType, QueryFilter, UpdateWriteOpResult } from "mongoose";
import { IProduct } from "../model/product.model";
import { DBRepo } from "./DB.repo";

export class ProductRepo extends DBRepo<IProduct> {
    constructor(protected readonly model: Model<IProduct>) {
        super(model);
    }

    async createProduct(data: Partial<IProduct>): Promise<HydratedDocument<IProduct>> {
        const product = await this.model.create(data);
        if (!product) {
            throw new Error("product not created");
        }
        return product;
    }

    async findAll(
        filter: QueryFilter<IProduct>,
        select?: ProjectionType<IProduct>,
        page: number = 1,
        limit: number = 20
    ): Promise<{ products: HydratedDocument<IProduct>[]; total: number }> {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const skip = (Math.max(page, 1) - 1) * safeLimit;

        const [products, total] = await Promise.all([
            this.model
                .find(filter, select)
                .populate("category", "name")
                .populate("modifiers")
                .populate("offerProducts.product", "name price image")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean() as unknown as HydratedDocument<IProduct>[],
            this.model.countDocuments(filter),
        ]);

        return { products, total };
    }

    async findByIdWithPopulate(id: string): Promise<HydratedDocument<IProduct> | null> {
        return this.model.findById(id)
            .populate("category", "name")
            .populate("modifiers")
            .populate("offerProducts.product", "name price image") as unknown as HydratedDocument<IProduct> | null;
    }

    async findByIds(ids: string[]): Promise<HydratedDocument<IProduct>[]> {
        return this.model.find({ _id: { $in: ids } }).lean() as unknown as HydratedDocument<IProduct>[];
    }

    async softDelete(id: string): Promise<UpdateWriteOpResult> {
        return this.model.updateOne({ _id: id }, { isDeleted: true, isAvailable: false });
    }

    async findByCategory(categoryId: string): Promise<HydratedDocument<IProduct>[]> {
        return this.model.find({ category: categoryId }).select("image") as unknown as HydratedDocument<IProduct>[];
    }

    async deleteManyByCategory(categoryId: string): Promise<void> {
        await this.model.deleteMany({ category: categoryId });
    }
}
