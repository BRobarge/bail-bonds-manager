import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const inspectPdf = async (filename) => {
    try {
        const pdfBytes = fs.readFileSync(`public/assets/${filename}`);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        console.log(`\n--- Fields in ${filename} ---`);
        fields.forEach(field => {
            const type = field.constructor.name;
            const name = field.getName();
            console.log(`${name} (${type})`);
        });
    } catch (error) {
        console.error(`Error inspecting ${filename}:`, error.message);
    }
};

(async () => {
    await inspectPdf('District Bond Template.pdf');
    await inspectPdf('Justice of the Peace Bond Template.pdf');
})();
