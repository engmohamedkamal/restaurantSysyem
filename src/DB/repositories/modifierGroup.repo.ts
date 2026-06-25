import { HydratedDocument, Model, QueryFilter, UpdateWriteOpResult } from "mongoose";
import { IModifierGroup } from "../model/modifierGroup.model";
import { DBRepo } from "./DB.repo";

export class ModifierGroupRepo extends DBRepo<IModifierGroup> {
    constructor(protected readonly model: Model<IModifierGroup>) {
        super(model);
    }

    async findAll(
        filter: QueryFilter<IModifierGroup>,
        page: number = 1,
        limit: number = 50
    ): Promise<{ modifierGroups: HydratedDocument<IModifierGroup>[]; total: number }> {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const skip = (Math.max(page, 1) - 1) * safeLimit;

        const [modifierGroups, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean() as unknown as HydratedDocument<IModifierGroup>[],
            this.model.countDocuments(filter),
        ]);

        return { modifierGroups, total };
    }

    async findByIds(ids: string[]): Promise<HydratedDocument<IModifierGroup>[]> {
        return this.model.find({ _id: { $in: ids } }).lean() as unknown as HydratedDocument<IModifierGroup>[];
    }

    async deleteById(id: string): Promise<any> {
        return this.model.findByIdAndDelete(id);
    }
}
