
import { compare, hash } from "bcrypt"

export const Hash = async (plainText: string, saltRound: number = Number(process.env.SALT_ROUND)) => {
    return await hash(plainText, saltRound)
}

export const Compare = async (plainText: string, hashedText: string) => {
    return await compare(plainText, hashedText)
}