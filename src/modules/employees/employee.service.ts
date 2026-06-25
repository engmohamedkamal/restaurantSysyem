import { Request, Response, NextFunction } from "express";
import employeeModel from "../../DB/model/employee.model";
import { EmployeeRepo } from "../../DB/repositories/employee.repo";
import { AppError } from "../../utils/AppError";
import { Hash } from "../../utils/hash";
import { uploadBuffer } from "../../utils/cloudinaryHelpers";
import cloudinary from "../../utils/cloudInary";
import { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesQuery } from "./employee.validation";

class EmployeeService {
    private _employeeRepo = new EmployeeRepo(employeeModel);

    constructor() {}

    createEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const {
            name, phone, email, username, password,
            role, salaryType, salary, hourlyRate,
            hireDate, permissions, isActive,
        }: CreateEmployeeInput = req.body;

        const existingEmployee = await this._employeeRepo.findOne({
            $or: [
                { username },
                { phone },
                ...(email ? [{ email }] : [])
            ],
            isDeleted: false
        } as any);

        if (existingEmployee) {
            let conflictField = "username";
            if (existingEmployee.phone === phone) conflictField = "phone";
            if (email && existingEmployee.email === email) conflictField = "email";
            
            throw new AppError(`${conflictField} already exists`, 409);
        }

        const hashedPassword = await Hash(password);

        let image = { secure_url: "", public_id: "" };
        if (req.file) {
            const uploadResult = await uploadBuffer(
                req.file.buffer,
                `restaurant/employees`,
                "image"
            );
            image = {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            };
        }

        const employee = await this._employeeRepo.createEmployee({
            name,
            phone,
            email: email || "",
            username: username.toLowerCase(),
            password: hashedPassword,
            role: role as any,
            salaryType: salaryType as any,
            salary,
            hourlyRate,
            hireDate: hireDate ? new Date(hireDate) : new Date(),
            permissions: permissions as any,
            isActive: isActive ?? true,
            image,
            createdBy: req.user!._id as any,
        } as any);

        const employeeObj = employee.toObject();
        delete (employeeObj as any).password;

        return res.status(201).json({
            message: "employee created successfully",
            employee: employeeObj,
        });
    };

    listEmployees = async (req: Request, res: Response, next: NextFunction) => {
        const { page = 1, limit = 20, role, isActive, search }: ListEmployeesQuery = req.query as any;

        const filter: Record<string, any> = { isDeleted: false };

        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive;

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.name = { $regex: escapedSearch, $options: "i" };
        }

        const { employees, total } = await this._employeeRepo.findAll(
            filter,
            "-password -__v",
            Number(page),
            Number(limit)
        );

        return res.status(200).json({
            message: "success",
            data: employees,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    };

    getEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const employee = await this._employeeRepo.findById(id);
        if (!employee) {
            throw new AppError("employee not found", 404);
        }

        return res.status(200).json({
            message: "success",
            employee,
        });
    };

    updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;
        const updateData: UpdateEmployeeInput = req.body;

        const employee = await this._employeeRepo.findById(id);
        if (!employee) {
            throw new AppError("employee not found", 404);
        }

        if (updateData.username && updateData.username.toLowerCase() !== employee.username) {
            const existing = await this._employeeRepo.findOne({username:updateData.username});
            if (existing) {
                throw new AppError("username already exists", 409);
            }
            updateData.username = updateData.username.toLowerCase();
        }

        if (updateData.password) {
            updateData.password = await Hash(updateData.password);
        }

        const updatePayload: Record<string, any> = { ...updateData };
        delete updatePayload.cPassword;

        if (req.file) {
            if (employee.image?.public_id) {
                await cloudinary.uploader.destroy(employee.image.public_id).catch(() => {});
            }

            const uploadResult = await uploadBuffer(
                req.file.buffer,
                `restaurant/employees`,
                "image"
            );
            updatePayload.image = {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            };
        }

        if (updatePayload.hireDate) {
            updatePayload.hireDate = new Date(updatePayload.hireDate);
        }

        await this._employeeRepo.updateOne({ _id: id } as any, { $set: updatePayload });

        const updatedEmployee = await this._employeeRepo.findById(id);

        return res.status(200).json({
            message: "employee updated successfully",
            employee: updatedEmployee,
        });
    };

    deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id as string;

        const employee = await this._employeeRepo.findById(id);
        if (!employee) {
            throw new AppError("employee not found", 404);
        }

        await this._employeeRepo.hardDelete(id);

        return res.status(200).json({
            message: "employee deleted successfully",
        });
    };
}

export default new EmployeeService();
