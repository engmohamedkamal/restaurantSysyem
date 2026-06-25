import { resolve } from "path"
import { config } from "dotenv"
config({ path: resolve("./config/.env") })
import express, { Request, Response, NextFunction } from "express";
import cors from "cors"
import helmet from "helmet"
import { rateLimit } from "express-rate-limit"
import { AppError } from "./utils/AppError";
import userRouter from "./modules/users/user.controller";
import employeeRouter from "./modules/employees/employee.controller";
import categoryRouter from "./modules/categories/category.controller";
import productRouter from "./modules/products/product.controller";
import modifierRouter from "./modules/modifiers/modifierGroup.controller";
import cartRouter from "./modules/cart/cart.controller";
import orderRouter from "./modules/orders/order.controller";
import menuScannerRouter from "./modules/menuScanner/menuScanner.controller";
import couponRouter from "./modules/Copon/Copon.controller";
import shiftRouter from "./modules/shifts/shift.controller";
import expenseRouter from "./modules/expenses/expense.controller";
import ConnectionDB from "./DB/connectionDB";
import "./queues/email.worker"
import { Server } from "socket.io"

const app: express.Application = express()
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: "Too many requests, please try again later"
})
const bootstrap = () => {

    const port: string | number = process.env.PORT || 8080

    app.set("trust proxy", 1)

    app.use(express.json())
    app.use(cors())
    app.use(helmet())
    app.use(limiter)


    app.get("/", (req: Request, res: Response, next: NextFunction) => {
        return res.status(200).json({ message: "welcome to our restaurant system" })
    })

    app.use("/users", userRouter)
    app.use("/employees", employeeRouter)
    app.use("/categories", categoryRouter)
    app.use("/products", productRouter)
    app.use("/modifiers", modifierRouter)
    app.use("/cart", cartRouter)
    app.use("/orders", orderRouter)
    app.use("/menu-scanner", menuScannerRouter)
    app.use("/coupons", couponRouter)
    app.use("/shifts", shiftRouter)
    app.use("/expenses", expenseRouter)

    ConnectionDB()

    app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
        throw new AppError(`this url ${req.originalUrl} does not exist`, 404)
    })

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        const statusCode = err.statusCode || 500
        return res.status(statusCode).json({ message: err.message, stack: err.stack })
    })

    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`)
    })

    const io = new Server(server ,{
        cors: {
            origin: "*"
        }
    })

    io.on("connection",(socket)=>{
        // socket.on("hi",(data , callback)=>{
        //     console.log(data);
        //     callback("hello from server")
        // })
        console.log(`user connected ${socket.id}`)
    })
}

export default bootstrap 