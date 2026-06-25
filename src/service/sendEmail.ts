import nodemailer from "nodemailer"
import Mail from "nodemailer/lib/mailer";

export const sendEmail = async (mailOptions: Mail.Options) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const info = await transporter.sendMail({
        from: `"Restaurants system" <${process.env.EMAIL_USER}>`,
        ...mailOptions
        // to: "[EMAIL_ADDRESS]",
        // subject: "Hello ✔",
        // text: "Hello world?",
        // html: "<b>Hello world?</b>",
    });
}

export const generateRandomCode=async()=>{
    return Math.floor(Math.random()*(999999- 100000 + 1)+100000)
    
}


