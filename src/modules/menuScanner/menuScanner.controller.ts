import { Router } from "express";
import MSS from "./menuScanner.service";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { MulterHost, allowedExtensions } from "../../middleware/multer";

const menuScannerRouter = Router();

// Allow up to 5 files (Images or PDFs), max 10MB per file
const upload = MulterHost({ customExtension: allowedExtensions.uploadAnyFiles, fileSizeMB: 10 });

// Endpoint is protected and restricted to Managers
menuScannerRouter.use(authentication(), authorization("manager"));

menuScannerRouter.post("/scan-and-import",
    upload.array("menu_files", 5),
    MSS.scanAndImportMenu
);

export default menuScannerRouter;
