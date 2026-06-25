import { Request, Response, NextFunction } from "express";
import categoryModel from "../../DB/model/category.model";
import productModel from "../../DB/model/product.model";
import { CategoryRepo } from "../../DB/repositories/category.repo";
import { ProductRepo } from "../../DB/repositories/product.repo";
import { AppError } from "../../utils/AppError";
import { uploadBuffer } from "../../utils/cloudinaryHelpers";
import cloudinary from "../../utils/cloudInary";
import { CreateCategoryInput, UpdateCategoryInput, ListCategoriesQuery } from "./category.validation";

class CategoryService {
    private _categoryRepo = new CategoryRepo(categoryModel);
    private _productRepo = new ProductRepo(productModel);

    constructor() {}

    createCategory = async (req: Request, res: Response, next: NextFunction) => {
        const { name, description, icon, displayOrder, isActive }: CreateCategoryInput = req.body;

        const existingCategory = await this._categoryRepo.findOne({ name } as any);
        if (existingCategory) {
            throw new AppError("category already exists", 409);
        }

        if (!req.file) {
            throw new AppError("category image is required", 400);
        }

        const uploadResult = await uploadBuffer(
            req.file.buffer,
            `restaurant/categories`,
            "image"
        );

        const category = await this._categoryRepo.createCategory({
            name,
            ...(description !== undefined && { description }),
            ...(icon !== undefined && { icon }),
            ...(displayOrder !== undefined && { displayOrder }),
            isActive: isActive ?? true,
            image: {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            },
            createdBy: req.user!._id as any,
        });

        return res.status(201).json({
            message: "category created successfully",
            category,
        });
    };

    getCategories = async (req: Request, res: Response, next: NextFunction) => {
        const { page = 1, limit = 20, isActive, search }: ListCategoriesQuery = req.query as any;

        const filter: Record<string, any> = {};

        if (isActive !== undefined) filter.isActive = isActive;

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.name = { $regex: escapedSearch, $options: "i" };
        }

        const { categories, total } = await this._categoryRepo.findAll(
            filter,
            Number(page),
            Number(limit)
        );

        const [totalCategories, activeCategories, inactiveCategories] = await Promise.all([
            categoryModel.countDocuments({ isDeleted: false }),
            categoryModel.countDocuments({ isDeleted: false, isActive: true }),
            categoryModel.countDocuments({ isDeleted: false, isActive: false })
        ]);

        return res.status(200).json({
            message: "success",
            stats: {
                total: totalCategories,
                active: activeCategories,
                inactive: inactiveCategories
            },
            data: categories,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    };

    getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const category = await this._categoryRepo.findByIdWithProducts(id);
        if (!category) {
            throw new AppError("category not found", 404);
        }

        return res.status(200).json({
            message: "success",
            category,
        });
    };

    updateCategory = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;
        const updateData: UpdateCategoryInput = req.body;

        const category = await this._categoryRepo.findById(id);
        if (!category) {
            throw new AppError("category not found", 404);
        }

        if (updateData.name && updateData.name !== category.name) {
            const existing = await this._categoryRepo.findOne({ name: updateData.name } as any);
            if (existing) {
                throw new AppError("category name already exists", 409);
            }
        }

        const updatePayload: Record<string, any> = { ...updateData };

        if (req.file) {
            if (category.image?.public_id) {
                await cloudinary.uploader.destroy(category.image.public_id).catch(() => {});
            }

            const uploadResult = await uploadBuffer(
                req.file.buffer,
                `restaurant/categories`,
                "image"
            );
            updatePayload.image = {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            };
        }

        await this._categoryRepo.updateOne({ _id: id } as any, { $set: updatePayload });

        const updatedCategory = await this._categoryRepo.findById(id);

        return res.status(200).json({
            message: "category updated successfully",
            category: updatedCategory,
        });
    };

    toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const category = await this._categoryRepo.findById(id);
        if (!category) {
            throw new AppError("category not found", 404);
        }

        await this._categoryRepo.updateOne(
            { _id: id } as any,
            { $set: { isActive: !category.isActive } }
        );

        return res.status(200).json({
            message: `category is now ${!category.isActive ? "active" : "inactive"}`,
            isActive: !category.isActive,
        });
    };

    deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const category = await this._categoryRepo.findById(id);
        if (!category) {
            throw new AppError("category not found", 404);
        }

        // Perform soft deletes instead of hard deletes to protect historical order records via Repository
        await this._productRepo.updateMany({ category: id } as any, { $set: { isDeleted: true, isAvailable: false } } as any);
        await this._categoryRepo.updateOne({ _id: id } as any, { $set: { isDeleted: true, isActive: false } } as any);

        return res.status(200).json({
            message: "category and all its products soft-deleted successfully",
        });
    };
}

export default new CategoryService();
