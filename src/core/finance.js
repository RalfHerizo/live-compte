import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Calcule le solde cumulé pour chaque transaction.
 * @param {Array} transactions - Liste brute (date, libelle, recette, depense)
 * @returns {Array} - Liste enrichie de la propriété 'solde'
 */
export const filterTransactionsByDate = (transactions, dateFilter) => {
  if (!dateFilter || dateFilter.mode === "all") {
    return transactions;
  }

  if (dateFilter.mode === "month") {
    const month = dateFilter.month;
    if (!month) return transactions;
    return transactions.filter((transaction) => String(transaction.date).startsWith(month));
  }

  if (dateFilter.mode === "range") {
    const from = dateFilter.from;
    const to = dateFilter.to;

    return transactions.filter((transaction) => {
      const currentDate = String(transaction.date);
      const afterFrom = !from || currentDate >= from;
      const beforeTo = !to || currentDate <= to;
      return afterFrom && beforeTo;
    });
  }

  return transactions;
};

export const computeBalances = (transactions) => {
  let runningBalance = 0;
  let totalRecettes = 0;
  let totalDepenses = 0;

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const items = sorted.map((transactions) => {
    const recette = Number(transactions.recette) || 0;
    const depense = Number(transactions.depense) || 0;
    
    totalRecettes += recette;
    totalDepenses += depense;
    runningBalance += (recette - depense);

    return {
      ...transactions,
      solde: runningBalance,
    };
  });

  return {
    items,
    totalRecettes,
    totalDepenses,
    soldeFinal: runningBalance
  };
};

function exportPDF(transactions, libelle, dateFrom, dateTo) {
  const doc = new jsPDF();

  const header = `Résidence LA FELICITE Ambatoroaka. \nFacture du ${libelle} de ${dateFrom} au ${dateTo}`;

  const addHeader = () => {
    const pageWidth = doc.internal.pageSize.width;
    const yPos = 15;
    
    // Ligne 1 : Résidence LA FELICITE Ambatoroaka.
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Résidence ", 65, yPos); // Ajuste le X selon tes besoins
    
    doc.setFont("helvetica", "bold");
    doc.text("LA FELICITE", 86, yPos); 
    
    doc.setFont("helvetica", "normal");
    doc.text(" Ambatoroaka.", 112, yPos);

    // Ligne 2 : La date (en dessous)
    doc.text(`Facture du ${libelle} de ${dateFrom} au ${dateTo}`, pageWidth / 2, yPos + 7, { align: 'center' });
  };

  const addFooter = (data) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(10);

    const prefix = "Résidence ";
    const boldPart = "LA FELICITE";
    const suffix = ", bis au Lot VB 72 ZX Ambatoroaka.";

    // Calcul pour centrer l'ensemble
    const totalWidth = doc.getTextWidth(prefix + boldPart + suffix);
    let currentX = (pageWidth - totalWidth) / 2;

    doc.setFont("helvetica", "normal");
    doc.text(prefix, currentX, pageHeight - 10);
    currentX += doc.getTextWidth(prefix);

    doc.setFont("helvetica", "bold");
    doc.text(boldPart, currentX, pageHeight - 10);
    currentX += doc.getTextWidth(boldPart);

    doc.setFont("helvetica", "normal");
    doc.text(suffix, currentX, pageHeight - 10);
  };

  const tableData = transactions.map((t) => [
    new Date(t.date).toLocaleDateString('fr-FR'),
    t.libelle.toUpperCase(),
    t.recette > 0 ? `${t.recette.toLocaleString()} Ar` : '-',
    t.depense > 0 ? `${t.depense.toLocaleString()} Ar` : '-',
    t.solde.toLocaleString() + ' Ar',
  ]);

  const totalRow = [
    'TOTAL GENERAL',
    '',
    `${transactions.reduce((sum, t) => sum + (t.recette || 0), 0).toLocaleString()} Ar`,
    `${transactions.reduce((sum, t) => sum + (t.depense || 0), 0).toLocaleString()} Ar`,
    `${transactions[transactions.length - 1]?.solde.toLocaleString()} Ar`,
  ];

  autoTable(doc, {
    head: [['Date', 'Libellé', 'Recettes', 'Dépenses', 'Solde'].map( header=> header.toUpperCase())],
    body: [...tableData, totalRow],
    startY: 25, // Leave space for the header
    headStyles: {
      fillColor: [26, 26, 26], // Noir en RGB
      textColor: [255, 255, 255], // Texte en blanc pour le contraste
      fontStyle: 'bold',
    },
    margin: { top: 25, bottom: 25 }, // Ensure space for header and footer
    
    didParseCell: (data) => {
      const isTotalRow = data.row.index === tableData.length;
      if (isTotalRow) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [26, 26, 26];
        data.cell.styles.textColor = [255, 255, 255];
      }
    },

    didDrawPage: (data) => {
      addHeader();
      addFooter(data);
    },
  });

  doc.save('facture.pdf');
}

export default exportPDF;

