const fs = require('fs');
let code = fs.readFileSync('src/components/DonorIdentityPassModal.tsx', 'utf8');

code = code.replace(
  'import html2canvas from "html2canvas";',
  'import * as htmlToImage from "html-to-image";'
);

code = code.replace(
  'const canvas = await html2canvas(cardRef.current, { scale: 4, backgroundColor: \'#111111\' });\n    const imgData = canvas.toDataURL(\'image/jpeg\', 1.0);\n    const pdf = new jsPDF({\n      orientation: \'landscape\',\n      unit: \'px\',\n      format: [canvas.width, canvas.height]\n    });\n    pdf.addImage(imgData, \'JPEG\', 0, 0, canvas.width, canvas.height);',
  `// Use html-to-image instead of html2canvas to avoid oklab/oklch parsing errors
    const imgData = await htmlToImage.toJpeg(cardRef.current, { quality: 1.0, pixelRatio: 4, backgroundColor: '#111111' });
    
    // We need to calculate dimensions manually since we don't get a canvas object back directly
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width * 4;
    const height = rect.height * 4;
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [width, height]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);`
);

fs.writeFileSync('src/components/DonorIdentityPassModal.tsx', code);
