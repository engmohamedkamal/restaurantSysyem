import mongoose from "mongoose"

export const ConnectionDB = () => {
    mongoose.connect(process.env.BD_URL_ONLINE as unknown as string)
        .then(() => {
            console.log("success to connection DB");
        }).catch((error) => {
            console.log("fail to connection DB",error);

        })
}

export default ConnectionDB