import z from "zod";

const nameField = z.string().min(2, "name must be at least 2 characters").max(50, "name must be at most 50 characters").trim();
const phoneField = z.string().regex(/^01[0125][0-9]{8}$/, "invalid Egyptian phone number");
const emailField = z.string().email("invalid email format").optional();
const usernameField = z.string().min(3, "username must be at least 3 characters").max(30, "username must be at most 30 characters").trim();
const passwordField = z.string().min(8, "password must be at least 8 characters")
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, "password must contain at least one uppercase, one lowercase, and one digit");
const roleField = z.enum(["manager", "chef", "cashier", "waiter"], { message: "role must be one of: manager, chef, cashier, waiter" });
const salaryTypeField = z.enum(["hourly", "monthly"], { message: "salaryType must be one of: hourly, monthly" }).optional();
const salaryField = z.coerce.number().min(0, "salary cannot be negative").optional();
const hourlyRateField = z.coerce.number().min(0, "hourlyRate cannot be negative").optional();
const hireDateField = z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date format (YYYY-MM-DD)").optional());

const permissionsSchema = z.object({
    orderManagement: z.boolean().optional(),
    cashier: z.boolean().optional(),
    productManagement: z.boolean().optional(),
    inventory: z.boolean().optional(),
    reports: z.boolean().optional(),
}).optional();

export const createEmployeeSchema = {
    body: z.object({
        name: nameField,
        phone: phoneField,
        email: emailField,
        username: usernameField,
        password: passwordField,
        cPassword: z.string(),
        role: roleField,
        salaryType: salaryTypeField,
        salary: salaryField,
        hourlyRate: hourlyRateField,
        hireDate: hireDateField,
        permissions: permissionsSchema,
        isActive: z.boolean().optional(),
    }).refine((data) => data.password === data.cPassword, {
        message: "passwords do not match",
        path: ["cPassword"],
    }),
};

export const updateEmployeeSchema = {
    body: z.object({
        name: nameField.optional(),
        phone: phoneField.optional(),
        email: emailField,
        username: usernameField.optional(),
        password: passwordField.optional(),
        cPassword: z.string().optional(),
        role: roleField.optional(),
        salaryType: salaryTypeField,
        salary: salaryField,
        hourlyRate: hourlyRateField,
        hireDate: hireDateField,
        permissions: permissionsSchema,
        isActive: z.boolean().optional(),
    }).refine((data) => {
        if (data.password && data.password !== data.cPassword) return false;
        return true;
    }, {
        message: "passwords do not match",
        path: ["cPassword"],
    }),
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid employee ID"),
    }),
};

export const getEmployeeSchema = {
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid employee ID"),
    }),
};

export const listEmployeesSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        role: z.enum(["manager", "chef", "cashier", "waiter"]).optional(),
        isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
        search: z.string().max(100).optional(),
    }),
};

export const deleteEmployeeSchema = {
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid employee ID"),
    }),
};

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema.body>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema.body>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesSchema.query>;