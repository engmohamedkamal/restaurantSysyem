import { EventEmitter } from "events"
import { generateRandomCode, sendEmail } from "../service/sendEmail"
import { EmailHTML } from "../service/emailTemp"

export const eventEmitter = new EventEmitter()


eventEmitter.on("confirmEmail", async(data)=> {
    const { otp , email } = data
    await sendEmail({
        to: email,
        subject: "confirm Email",
        html: EmailHTML(otp.toString()),

    })
})