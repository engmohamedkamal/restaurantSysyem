import { HydratedDocument, Model, ProjectionType, QueryFilter, UpdateQuery, UpdateWriteOpResult } from "mongoose";
import { IEmployee } from "../model/employee.model";
import { DBRepo } from "./DB.repo";

export class EmployeeRepo extends DBRepo<IEmployee> {
    constructor(protected readonly model: Model<IEmployee>) {
        super(model);
    }

    async createEmployee(data: Partial<IEmployee>): Promise<HydratedDocument<IEmployee>> {
        const employee = await this.model.create(data);
        if (!employee) {
            throw new Error("employee not created");
        }
        return employee;
    }

    async findAll(
        filter: QueryFilter<IEmployee>,
        select?: ProjectionType<IEmployee>,
        page: number = 1,
        limit: number = 20
    ): Promise<{ employees: HydratedDocument<IEmployee>[]; total: number }> {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const skip = (Math.max(page, 1) - 1) * safeLimit;

        const [employees, total] = await Promise.all([
            this.model
                .find(filter, select)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean() as unknown as HydratedDocument<IEmployee>[],
            this.model.countDocuments(filter),
        ]);

        return { employees, total };
    }


    async hardDelete(id: string): Promise<void> {
        await this.model.deleteOne({ _id: id });
    }
}
