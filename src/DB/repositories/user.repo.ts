import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser, Role } from "../model/user.model";
import { DBRepo } from "./DB.repo";


export class UserRepo extends DBRepo<IUser>{
   constructor(protected readonly model: Model<IUser>){
      super(model)
   }

   async createOneUser(data:Partial<IUser>): Promise<HydratedDocument<IUser>>{
    const user=await this.model.create(data)
    if(!user){
        throw new Error("user not created")
    }
    return user;
   }

   async findAllUsers(
      page: number = 1,
      limit: number = 20
   ): Promise<{ users: HydratedDocument<IUser>[]; total: number }> {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
         this.model.find({ isDeleted: false, role: Role.user }).skip(skip).limit(limit).select("-password"),
         this.model.countDocuments({ isDeleted: false, role: Role.user })
      ]);
      return { users, total };
   }
}