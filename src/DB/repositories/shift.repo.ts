import { Model } from "mongoose";
import { IShift } from "../model/shift.model";
import { DBRepo } from "./DB.repo";

export class ShiftRepo extends DBRepo<IShift> {
    constructor(protected readonly model: Model<IShift>) {
        super(model);
    }

    async findByIdWithEmployee(id: any): Promise<any> {
        return this.model.findById(id).populate("employee", "name username role").lean();
    }

    async findActiveShiftsWithEmployee(): Promise<any> {
        return this.model.find({ isActive: true }).populate("employee", "name username role").lean();
    }
}
