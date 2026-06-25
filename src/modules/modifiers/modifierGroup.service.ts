import { Request, Response, NextFunction } from "express";
import modifierGroupModel from "../../DB/model/modifierGroup.model";
import productModel from "../../DB/model/product.model";
import { ModifierGroupRepo } from "../../DB/repositories/modifierGroup.repo";
import { ProductRepo } from "../../DB/repositories/product.repo";
import { AppError } from "../../utils/AppError";
import { CreateModifierGroupInput, UpdateModifierGroupInput, ListModifierGroupsQuery } from "./modifierGroup.validation";

class ModifierGroupService {
    private _modifierGroupRepo = new ModifierGroupRepo(modifierGroupModel);
    private _productRepo = new ProductRepo(productModel);

    constructor() { }

    createModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { name, minSelect, maxSelect, options }: CreateModifierGroupInput = req.body as any;

        const modifierGroup = await this._modifierGroupRepo.create({
            name,
            minSelect,
            maxSelect,
            options,
            createdBy: req.user!._id as any,
        });

        return res.status(201).json({
            message: "Modifier group created successfully",
            modifierGroup,
        });
    };

    listModifierGroups = async (req: Request, res: Response, next: NextFunction) => {
        const { page = 1, limit = 20, search }: ListModifierGroupsQuery = req.query as any;

        const filter: Record<string, any> = {};

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.name = { $regex: escapedSearch, $options: "i" };
        }

        const { modifierGroups, total } = await this._modifierGroupRepo.findAll(
            filter,
            Number(page),
            Number(limit)
        );

        return res.status(200).json({
            message: "success",
            data: modifierGroups,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    };

    getModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const modifierGroup = await this._modifierGroupRepo.findById(id);
        if (!modifierGroup) {
            throw new AppError("Modifier group not found", 404);
        }

        return res.status(200).json({
            message: "success",
            modifierGroup,
        });
    };

    updateModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;
        const updateData: UpdateModifierGroupInput = req.body;

        const modifierGroup = await this._modifierGroupRepo.findById(id);
        if (!modifierGroup) {
            throw new AppError("Modifier group not found", 404);
        }

        // Validate minSelect/maxSelect consistency after update
        const finalMinSelect = updateData.minSelect ?? modifierGroup.minSelect;
        const finalMaxSelect = updateData.maxSelect ?? modifierGroup.maxSelect;
        if (finalMaxSelect < finalMinSelect) {
            throw new AppError("maxSelect must be >= minSelect", 400);
        }

        await this._modifierGroupRepo.updateOne(
            { _id: id } as any,
            { $set: updateData }
        );

        const updatedModifierGroup = await this._modifierGroupRepo.findById(id);

        return res.status(200).json({
            message: "Modifier group updated successfully",
            modifierGroup: updatedModifierGroup,
        });
    };

    deleteModifierGroup = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const modifierGroup = await this._modifierGroupRepo.findById(id);
        if (!modifierGroup) {
            throw new AppError("Modifier group not found", 404);
        }

        await this._productRepo.updateMany(
            { modifiers: id } as any,
            { $pull: { modifiers: id } } as any
        );

        await this._modifierGroupRepo.deleteById(id);

        return res.status(200).json({
            message: "Modifier group deleted successfully",
        });
    };
}

export default new ModifierGroupService();
