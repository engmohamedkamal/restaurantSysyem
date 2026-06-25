import { Request, Response, NextFunction } from "express";
import productModel from "../../DB/model/product.model";
import categoryModel from "../../DB/model/category.model";
import modifierGroupModel from "../../DB/model/modifierGroup.model";
import { ProductRepo } from "../../DB/repositories/product.repo";
import { CategoryRepo } from "../../DB/repositories/category.repo";
import { ModifierGroupRepo } from "../../DB/repositories/modifierGroup.repo";
import { AppError } from "../../utils/AppError";
import { uploadBuffer } from "../../utils/cloudinaryHelpers";
import cloudinary from "../../utils/cloudInary";
import { CreateProductInput, UpdateProductInput, ListProductsQuery } from "./product.validation";

class ProductService {
    private _productRepo = new ProductRepo(productModel);
    private _categoryRepo = new CategoryRepo(categoryModel);
    private _modifierGroupRepo = new ModifierGroupRepo(modifierGroupModel);

    constructor() { }

    createProduct = async (req: Request, res: Response, next: NextFunction) => {
        const { name, description, price, oldPrice, category, isAvailable, modifiers, isOffer, offerEndDate, offerProducts }: CreateProductInput = req.body as any;

        const existingCategory = await this._categoryRepo.findById(category);
        if (!existingCategory) {
            throw new AppError("category not found", 404);
        }

        if (!req.file) {
            throw new AppError("product image is required", 400);
        }

        // Validate modifier group IDs if provided (single batch query)
        let validModifiers: any[] = [];
        if (modifiers && modifiers.length > 0) {
            const foundModifiers = await this._modifierGroupRepo.findByIds(modifiers);
            const foundIds = new Set(foundModifiers.map(m => m._id.toString()));
            for (const modId of modifiers) {
                if (!foundIds.has(modId.toString())) {
                    throw new AppError(`Modifier group with ID ${modId} not found`, 404);
                }
            }
            validModifiers = modifiers;
        }

        // Validate offer products if this is an offer (single batch query)
        let validOfferProducts: any[] = [];
        if (isOffer && offerProducts && offerProducts.length > 0) {
            const offerProductIds = offerProducts.map(op => op.product);
            const foundProducts = await this._productRepo.findByIds(offerProductIds);
            const productMap = new Map(foundProducts.map(p => [p._id.toString(), p]));
            for (const op of offerProducts) {
                const existing = productMap.get(op.product.toString());
                if (!existing) {
                    throw new AppError(`Offer product with ID ${op.product} not found`, 404);
                }
                if (existing.isDeleted) {
                    throw new AppError(`Offer product "${existing.name}" has been deleted`, 400);
                }
            }
            validOfferProducts = offerProducts;
        }

        // Validate offerEndDate is in the future if provided
        if (isOffer && offerEndDate && new Date(offerEndDate) <= new Date()) {
            throw new AppError("Offer end date must be in the future", 400);
        }

        const uploadResult = await uploadBuffer(
            req.file.buffer,
            `restaurant/products`,
            "image"
        );

        const product = await this._productRepo.createProduct({
            name,
            description,
            price,
            ...(oldPrice !== undefined && { oldPrice }),
            category: existingCategory._id as any,
            image: {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            },
            isAvailable: isAvailable ?? true,
            modifiers: validModifiers,
            isOffer: isOffer ?? false,
            ...(isOffer && offerEndDate && { offerEndDate: new Date(offerEndDate) }),
            ...(isOffer && validOfferProducts.length > 0 && { offerProducts: validOfferProducts }),
            createdBy: req.user!._id as any,
        } as any);

        // Re-fetch with populated data
        const populatedProduct = await this._productRepo.findByIdWithPopulate(product._id as any);

        return res.status(201).json({
            message: "product created successfully",
            product: populatedProduct,
        });
    };

    listProducts = async (req: Request, res: Response, next: NextFunction) => {
        const { page = 1, limit = 20, categoryId, isAvailable, isOffer, search }: ListProductsQuery = req.query as any;

        const filter: Record<string, any> = {
            isDeleted: false,
        };

        if (categoryId) filter.category = categoryId;
        if (isAvailable !== undefined) filter.isAvailable = isAvailable;
        if (isOffer !== undefined) filter.isOffer = isOffer;

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.name = { $regex: escapedSearch, $options: "i" };
        }

        const { products, total } = await this._productRepo.findAll(
            filter,
            "-__v",
            Number(page),
            Number(limit)
        );

        return res.status(200).json({
            message: "success",
            data: products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    };

    getProduct = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const product = await this._productRepo.findByIdWithPopulate(id);
        if (!product) {
            throw new AppError("product not found", 404);
        }

        return res.status(200).json({
            message: "success",
            product,
        });
    };

    updateProduct = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;
        const updateData: UpdateProductInput = req.body;

        const product = await this._productRepo.findById(id);
        if (!product) {
            throw new AppError("product not found", 404);
        }

        if (updateData.category) {
            const existingCategory = await this._categoryRepo.findById(updateData.category);
            if (!existingCategory) {
                throw new AppError("category not found", 404);
            }
        }

        const updatePayload: Record<string, any> = { ...updateData };

        // Validate modifier group IDs if provided (single batch query)
        if (updateData.modifiers && updateData.modifiers.length > 0) {
            const foundModifiers = await this._modifierGroupRepo.findByIds(updateData.modifiers);
            const foundIds = new Set(foundModifiers.map(m => m._id.toString()));
            for (const modId of updateData.modifiers) {
                if (!foundIds.has(modId)) {
                    throw new AppError(`Modifier group with ID ${modId} not found`, 404);
                }
            }
        }

        // Validate offer products if updating to/as an offer (single batch query)
        const willBeOffer = updateData.isOffer !== undefined ? updateData.isOffer : product.isOffer;
        if (willBeOffer && updateData.offerProducts && updateData.offerProducts.length > 0) {
            const offerProductIds = updateData.offerProducts.map(op => op.product);
            // Check self-reference
            if (offerProductIds.includes(id)) {
                throw new AppError("An offer product cannot reference itself", 400);
            }
            const foundProducts = await this._productRepo.findByIds(offerProductIds);
            const productMap = new Map(foundProducts.map(p => [p._id.toString(), p]));
            for (const op of updateData.offerProducts) {
                const existing = productMap.get(op.product);
                if (!existing) {
                    throw new AppError(`Offer product with ID ${op.product} not found`, 404);
                }
                if (existing.isDeleted) {
                    throw new AppError(`Offer product "${existing.name}" has been deleted`, 400);
                }
            }
        }

        // Validate offerEndDate is in the future if provided
        if (updateData.offerEndDate && new Date(updateData.offerEndDate) <= new Date()) {
            throw new AppError("Offer end date must be in the future", 400);
        }

        // If turning off offer, clear offer-specific fields
        if (updateData.isOffer === false) {
            updatePayload.offerEndDate = undefined;
            updatePayload.offerProducts = [];
        }

        if (req.file) {
            if (product.image?.public_id) {
                await cloudinary.uploader.destroy(product.image.public_id).catch(() => { });
            }

            const uploadResult = await uploadBuffer(
                req.file.buffer,
                `restaurant/products`,
                "image"
            );
            updatePayload.image = {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            };
        }

        await this._productRepo.updateOne({ _id: id } as any, { $set: updatePayload });

        const updatedProduct = await this._productRepo.findByIdWithPopulate(id);

        return res.status(200).json({
            message: "product updated successfully",
            product: updatedProduct,
        });
    };

    toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const product = await this._productRepo.findById(id);
        if (!product) {
            throw new AppError("product not found", 404);
        }

        await this._productRepo.updateOne(
            { _id: id } as any,
            { $set: { isAvailable: !product.isAvailable } }
        );

        return res.status(200).json({
            message: `product is now ${!product.isAvailable ? "available" : "unavailable"}`,
            isAvailable: !product.isAvailable,
        });
    };

    deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const product = await this._productRepo.findById(id);
        if (!product) {
            throw new AppError("product not found", 404);
        }

        await this._productRepo.softDelete(id);

        return res.status(200).json({
            message: "product deleted successfully",
        });
    };
}

export default new ProductService();
