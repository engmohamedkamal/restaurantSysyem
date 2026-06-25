import { NextFunction, Request, Response  } from "express";
import { AppError } from "../utils/AppError";
import { decodedTokenAndFetchUser, getSignature, TokenType } from "../utils/token";


export const authentication = (tokenType : TokenType = TokenType.access, isOptional: boolean = false)=>{
    return async(req:Request,res:Response,next:NextFunction)=>{
    const {authorization} = req.headers
    
    const [prefix , token] = authorization?.split(" ")  || [] 

    if (!prefix || !token) {
        if (isOptional) return next();
        throw new AppError("token not exist", 400)
    }
    if (prefix.toLowerCase() !== "bearer") {
        if (isOptional) return next();
        throw new AppError("Invalid token prefix", 400)
    }

    try {
        const Signature = await getSignature(tokenType)
        if(!Signature){
            throw new AppError("Invalid Signature ", 400)
        }

        const decoded=  await decodedTokenAndFetchUser(token , Signature )

        req.user = decoded.user
        req.decoded = decoded.decoded

        if (req.user?.isDeleted) {
            throw new AppError("account is frozen", 403);
        }
    } catch (error) {
        if (isOptional) return next();
        throw error;
    }
    return next()
}
}