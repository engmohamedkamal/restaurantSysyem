import { EmailHTML } from "../service/emailTemp";
import { sendEmail } from "../service/sendEmail";
import { Worker } from "bullmq";


const conneciton = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
}

export const EmailWorker = new Worker("emailQueue",
    async (job) => {
        console.log(`new email job:`, job.name, job.data);

        if (job.name === "send-otp") {
            const { email, otp } = job.data

            await sendEmail({
                to: email,
                subject: "confirm email",
                html: EmailHTML(otp.toString()),
            })

        }

    }, {
    connection: conneciton,
}
)
EmailWorker.on("completed", (job) => {
    console.log(`Email job completed: ${job.id}`);
});

EmailWorker.on("failed", (job, err) => {
    console.error(`Email job failed: ${job?.id}`);
    console.error(err.message);
}); 