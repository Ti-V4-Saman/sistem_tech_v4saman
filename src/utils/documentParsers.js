import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import html2pdf from "html2pdf.js";

// Configura o worker do pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extrai texto de um arquivo PDF.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let text = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const tolerance = 5;
          const lines = [];
          
          textContent.items.forEach(item => {
            if (!item.transform) return;
            const y = Math.round(item.transform[5]);
            const x = Math.round(item.transform[4]);
            
            let foundLine = lines.find(l => Math.abs(l.y - y) < tolerance);
            if (!foundLine) {
              foundLine = { y, items: [] };
              lines.push(foundLine);
            }
            foundLine.items.push({ x, str: item.str, width: item.width });
          });
          
          // PDF.js geralmente tem Y=0 no final da página (cresce de baixo pra cima)
          lines.sort((a, b) => b.y - a.y);
          
          lines.forEach(line => {
            line.items.sort((a, b) => a.x - b.x);
            let lineText = "";
            let lastX = -1;
            
            line.items.forEach(item => {
              if (lastX !== -1 && item.x - lastX > 15) { 
                lineText += " &nbsp;&nbsp;&nbsp;&nbsp; "; // Gap maior que espaço simples simula coluna
              } else if (lastX !== -1 && item.x - lastX > 2) {
                lineText += " ";
              }
              lineText += item.str;
              lastX = item.x + item.width;
            });
            
            if (lineText.trim()) {
              text += `<p style="margin: 2px 0;">${lineText.trim()}</p>`;
            }
          });
          
          text += `<hr/>`;
        }
        
        resolve(text);
      } catch (error) {
        console.error("Erro ao ler PDF:", error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extrai HTML de um arquivo DOCX.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractHtmlFromDOCX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const arrayBuffer = e.target.result;
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        resolve(result.value); // O HTML gerado
      } catch (error) {
        console.error("Erro ao ler DOCX:", error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta conteúdo HTML para um arquivo DOCX.
 * @param {string} htmlContent Conteúdo HTML do editor
 * @param {string} filename Nome do arquivo
 */
export function exportToDOCX(htmlContent, filename = "documento") {
  const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;

  const blob = new Blob(['\ufeff', sourceHTML], {
      type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.doc`; // Usa .doc por compatibilidade com application/msword
  document.body.appendChild(link);
  if (navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(blob, `${filename}.doc`);
  } else {
      link.click();
  }
  document.body.removeChild(link);
}

/**
 * Exporta um elemento HTML para um arquivo PDF usando html2pdf.js.
 * @param {HTMLElement} element O elemento a ser exportado
 * @param {string} filename Nome do arquivo
 */
export function exportToPDF(element, filename = "documento") {
  const opt = {
    margin:       10,
    filename:     `${filename}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}
