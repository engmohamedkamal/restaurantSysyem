import { IUser } from "../DB/model/user.model";
import { JwtPayload } from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            decoded?: JwtPayload;
        }
    }
}
