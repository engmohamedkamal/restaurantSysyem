import { HydratedDocument, Model } from "mongoose";
import { DBRepo } from "./DB.repo";
import { IRevokeToken } from "../model/revokeToken.model ";


export class revokeTokenRepo extends DBRepo<IRevokeToken>{
   constructor(protected readonly model: Model<IRevokeToken>){
      super(model)
   }

   async createOne(data: Partial<IRevokeToken>): Promise<HydratedDocument<IRevokeToken>>{
      return await this.model.create(data)
   }


}