import { PDFDocument } from 'pdf-lib';

export const fillBondForm = async (caseData) => {
    try {
        // 1. Load the template based on court type
        let formUrl = '/assets/District Bond Template.pdf';
        if (caseData.court_type === 'Justice') {
            formUrl = '/assets/Justice of the Peace Bond Template.pdf';
        }

        const formBytes = await fetch(formUrl).then(res => {
            if (!res.ok) throw new Error(`Form template not found: ${formUrl}`);
            return res.arrayBuffer();
        });

        // 2. Load into pdf-lib
        const pdfDoc = await PDFDocument.load(formBytes);
        const form = pdfDoc.getForm();

        // 3. Helper function to safely set text fields
        const safeSetText = (fieldName, value) => {
            try {
                const field = form.getTextField(fieldName);
                if (field) field.setText(value || '');
            } catch (e) {
                console.warn(`Field "${fieldName}" not found in PDF template.`);
            }
        };

        // 4. Map data to PDF fields based on court type
        const date = new Date();
        const day = date.getDate().toString();
        const month = (date.getMonth() + 1).toString();
        const year = date.getFullYear().toString().slice(-2);
        const fullDate = date.toLocaleDateString();

        if (caseData.court_type === 'Justice') {
            // Justice of the Peace Bond Template fields
            safeSetText('Defendant Name', caseData.defendant_name);
            safeSetText('SO#', caseData.defendant_booking_number);
            safeSetText('DOB', caseData.defendant_dob);
            safeSetText('Case Number', caseData.case_number);
            safeSetText('Date', fullDate);
            safeSetText('Charges Line 1', caseData.charges?.[0] || '');
            safeSetText('Charges Line 2', caseData.charges?.slice(1).join(', ') || '');
            safeSetText('Bail', caseData.bond_amount);
            safeSetText('Agent Name', caseData.bondsman_name || 'Dewey');
            safeSetText('Precinct', caseData.justice_court || '');
        } else {
            // District Bond Template fields
            safeSetText('Defendant Name', caseData.defendant_name);
            safeSetText('S.O. #', caseData.defendant_booking_number);
            safeSetText('Case #', caseData.case_number);
            safeSetText('County', caseData.county);
            safeSetText('District', caseData.district);
            safeSetText('Charges', caseData.charges?.[0] || '');
            safeSetText('Charges Cont', caseData.charges?.slice(1).join(', ') || '');
            safeSetText('Bail', caseData.bond_amount);
            safeSetText('Bond Agent', caseData.bondsman_name || 'Dewey');

            // Date fields
            safeSetText('Mo', month);
            safeSetText('Day', day);
            safeSetText('Year', year);
            safeSetText('Date', fullDate);
        }

        // 5. Generate PDF and display inline
        const pdfBytes = await pdfDoc.save();

        // Convert to base64 data URL for iframe (more compatible than blob)
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        const dataUrl = `data:application/pdf;base64,${base64}`;

        // Also create blob URL for download button
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // Create modal overlay to display PDF
        const overlay = document.createElement('div');
        overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      padding: 20px;
    `;

        const header = document.createElement('div');
        header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      color: white;
    `;

        const title = document.createElement('h2');
        title.textContent = 'Bond Form Generated';
        title.style.cssText = 'margin: 0; font-size: 20px;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px;';

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download PDF';
        downloadBtn.style.cssText = `
      padding: 10px 20px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    `;
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Bond_Form_${caseData.defendant_name?.replace(/\s+/g, '_') || 'Unknown'}.pdf`;
            link.click();
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
      padding: 10px 20px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    `;
        closeBtn.onclick = () => {
            document.body.removeChild(overlay);
            URL.revokeObjectURL(blobUrl);
        };

        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(buttonContainer);

        const iframe = document.createElement('iframe');
        iframe.src = dataUrl;
        iframe.style.cssText = `
      width: 100%;
      flex: 1;
      border: none;
      background: white;
      border-radius: 8px;
    `;

        overlay.appendChild(header);
        overlay.appendChild(iframe);
        document.body.appendChild(overlay);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF: ' + error.message);
    }
};
