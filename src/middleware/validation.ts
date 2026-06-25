import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";
import { AppError } from "../utils/AppError";

type requsetType = keyof Request
type SchemaType = Partial<Record<requsetType, ZodType>>

export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationError: ZodError[] = []
        for (const key of Object.keys(schema) as requsetType[]) {
            if (!schema[key]) continue
            const result = schema[key]?.safeParse(req[key])
            if (!result?.success) {
                validationError.push(result.error)
            } else {
                if (key === "query" || key === "params" || key === "headers") {
                    for (const prop of Object.keys((req as any)[key] || {})) {
                        delete (req as any)[key][prop];
                    }
                    Object.assign((req as any)[key], result.data);
                } else {
                    (req as any)[key] = result.data;
                }
            }
        }
        if (validationError.length) {
            const formattedErrors = validationError.flatMap((err) =>
                err.issues.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            );
            return res.status(400).json({
                message: "Validation failed",
                errors: formattedErrors
            });
        }
        next()
    }
}