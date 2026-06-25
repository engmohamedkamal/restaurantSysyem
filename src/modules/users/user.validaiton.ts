import z from "zod"

export const signInSchema = {
    body: z.object({
        email: z.string().email(),
        password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    }).required()
}

export const singUpSchema = {
    body: signInSchema.body.extend({
        name: z.string().min(2).max(50).trim(),
        cPassword: z.string(),
        addres: z.string(),
        phone: z.string().regex(/^01[0125][0-9]{8}$/)
    }).required().refine((data) => {
        return data.password === data.cPassword
    }, {
        message: "password not match",
        path: ["cPassword"]
    })
}

export const confirmEmailSchema = {
    body: z.object({
        email: z.string().email(),
        otp: z.string().regex(/^\d{6}$/)
    }).required()
}

export const resendOtpSchema = {
    body: z.object({
        email: z.string().email()
    }).required()
}

export const forgetPasswordSchema = {
    body: z.object({
        email: z.string().email()
    }).required()
}

export const resetPasswordSchema = {
    body: z.object({
        email: z.string().email(),
        otp: z.string().regex(/^\d{6}$/),
        password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    }).required()
}

export const signInWithGoogleSchema = {
    body: z.object({
        idToken: z.string()
    }).required()
}

export const updateSpecialNotesSchema = {
    body: z.object({
        specialNotes: z.string().trim()
    }).required()
}

export type signupSchemaType = z.infer<typeof singUpSchema.body>
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>
export type updateSpecialNotesSchemaType = z.infer<typeof updateSpecialNotesSchema.body>
export type resendOtpSchemaType = z.infer<typeof resendOtpSchema.body>
export type signInSchemaType = z.infer<typeof signInSchema.body>
export type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema.body>
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema.body>