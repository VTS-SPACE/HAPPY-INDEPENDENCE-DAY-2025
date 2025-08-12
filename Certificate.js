// Certificate.js
(function () {
    // Helper: filename safe
    function safeFileName(name) {
        return (name || 'Certificate').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
    }

    // Helper: set text safely
    function setText(id, txt) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = txt || '';
    }

    // Generate QR using qrcodejs (keeps element, doesn't remove it)
    function generateQRCode(containerId, text) {
        const container = document.getElementById(containerId);
        if (!container || typeof QRCode === 'undefined') return;
        container.innerHTML = ''; // only clear children, keep element itself
        new QRCode(container, {
            text: text || '',
            width: 110,
            height: 110,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Capture and build PDF (html2canvas + jsPDF)
    async function buildAndDownloadPDF(baseName) {
        const container = document.getElementById('certificate');
        if (!container) {
            alert('Certificate element not found.');
            window.location.href = 'index.html';
            return;
        }

        try {
            // allow rendering time (fonts/images)
            await new Promise(r => setTimeout(r, 500));

            // high-res canvas
            const canvas = await html2canvas(container, { scale: 3, useCORS: true, allowTaint: false });
            const imgData = canvas.toDataURL('image/png');

            if (window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                // choose orientation to best fit (use landscape)
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

                const pdfW = pdf.internal.pageSize.getWidth();
                const pdfH = pdf.internal.pageSize.getHeight();

                // fit while preserving aspect ratio
                const margin = 20;
                const maxW = pdfW - margin * 2;
                const maxH = pdfH - margin * 2;

                const imgW = canvas.width;
                const imgH = canvas.height;

                let renderW = maxW;
                let renderH = (imgH * renderW) / imgW;
                if (renderH > maxH) {
                    renderH = maxH;
                    renderW = (imgW * renderH) / imgH;
                }

                const x = (pdfW - renderW) / 2;
                const y = (pdfH - renderH) / 2;

                pdf.addImage(imgData, 'PNG', x, y, renderW, renderH, undefined, 'FAST');

                // Trigger download
                pdf.save(`${baseName}.pdf`);
            } else {
                // fallback to png
                const link = document.createElement('a');
                link.download = `${baseName}.png`;
                link.href = imgData;
                link.click();
            }
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to generate certificate. Please try again.');
        }
    }

    // Main routine: ask name, populate, download, redirect
    window.addEventListener('DOMContentLoaded', async () => {
        // Ask repeatedly until non-empty or Cancel
        let name = null;
        while (true) {
            name = window.prompt('Please enter your name for the certificate:');
            if (name === null) {
                // user pressed Cancel -> go back to index
                window.location.href = 'index.html';
                return;
            }
            name = (name || '').trim();
            if (name.length === 0) {
                alert('Name cannot be empty. Please enter your name.');
                continue;
            }
            break;
        }

        // set name in certificate (English and Hindi fields)
        setText('recipient-name', name);
        setText('recipient-name-hindi', name); // fallback: same name (no transliteration)

        // set date
        const today = new Date();
        setText('certificate-date', `Date: ${today.toLocaleDateString()}`);

        // generate QR (issuer + name + date)
        const qrText = `Issued by VANSH TECHNOLOGY SERVICES | Recipient: ${name} | Date: ${today.toLocaleDateString()}`;
        generateQRCode('digital-signature-qrcode', qrText);

        // build filename
        const filenameBase = `Certificate_${safeFileName(name)}_${today.getFullYear()}`;

        // auto-download PDF
        await buildAndDownloadPDF(filenameBase);

        // after download triggered, redirect back to index.html
        // small delay to let browser start download
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });
})();
// End of Certificate.js