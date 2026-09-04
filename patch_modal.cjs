const fs = require('fs');
let code = fs.readFileSync('src/components/DonorIdentityPassModal.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  'import { QRCodeSVG } from "qrcode.react";',
  'import { QRCodeSVG } from "qrcode.react";\nimport html2canvas from "html2canvas";\nimport jsPDF from "jspdf";'
);
code = code.replace(
  'HardDrive\n} from "lucide-react";',
  'HardDrive,\n  Download\n} from "lucide-react";'
);

// 2. Add generatePDF function
const generatePDFFunc = `
  const generatePDF = async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error("Card reference not found");
    // Hide buttons temporarily if they were inside (they are outside, so it's fine)
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#111111' });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    return pdf.output('blob');
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await generatePDF();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`Hemolink_Donor_Pass_\${donor.fullName.replace(/\\s+/g, '_')}.pdf\`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    }
  };
`;

code = code.replace(
  'const handlePrint = () => {',
  generatePDFFunc + '\n  const handlePrint = () => {'
);

// 3. Update handleSaveToDrive
code = code.replace(
  /const fileContent = `HEMOLINK VERIFIED DONOR PASS[\s\S]*?const metadata = {[\s\S]*?mimeType: 'text\/plain'[\s\S]*?};[\s\S]*?const form = new FormData\(\);[\s\S]*?form\.append\('file', new Blob\(\[fileContent\], \{ type: 'text\/plain' \}\)\);/,
  `const pdfBlob = await generatePDF();
        const metadata = {
            name: \`Hemolink_Donor_Pass_\${donor.fullName.replace(/\\s+/g, '_')}.pdf\`,
            mimeType: 'application/pdf'
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', pdfBlob);`
);

// 4. Update the layout
code = code.replace(
  'className="relative w-full max-w-2xl bg-[#0D0D0D] border border-border-dark rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none z-10 my-auto animate-in fade-in zoom-in-95 duration-200"',
  'className="relative w-full max-w-2xl bg-[#0D0D0D] border border-border-dark rounded-3xl shadow-2xl overflow-y-auto max-h-[95vh] sm:max-h-[90vh] print:shadow-none print:border-none print:rounded-none z-10 my-auto animate-in fade-in zoom-in-95 duration-200"'
);

// 5. Add Download Button
code = code.replace(
  /<button id="print-donor-pass-btn"/,
  `<button onClick={handleDownloadPDF} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-dark border border-border-dark text-text-subtle hover:text-white text-xs font-bold flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download PDF
            </button>
            <button id="print-donor-pass-btn"`
);
// Also adjust button text for Save to Drive to not say "print"
code = code.replace(
  'Save to Drive & Print</>}',
  'Save to Drive</>}'
);

fs.writeFileSync('src/components/DonorIdentityPassModal.tsx', code);
