
export class AppError extends Error{
    constructor(public message:any , public statusCode:number = 500){
        super(message)
    }
}