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

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

function exportPDF(transactions, libelle, dateFrom, dateTo) {
  const doc = new jsPDF();

  const dateFromFR = formatDate(dateFrom);
  const dateToFR = formatDate(dateTo);

  const addHeader = () => {
    const pageWidth = doc.internal.pageSize.width;
    const yPos = 15;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Espace ", 65, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.text("DEMO PUBLIC", 86, yPos); 
    
    doc.setFont("helvetica", "normal");
<<<<<<< HEAD
    doc.text("Edition demo", 118, yPos);
=======
    doc.text("Ambatoroka", 113, yPos);
>>>>>>> release/v1.0.1

    // Ligne 2 : libelle + dates en gras
    const headerParts = [
      { text: "Facture du ", bold: false },
      { text: libelle, bold: true },
      { text: " de ", bold: false },
      { text: dateFromFR, bold: true },
      { text: " au ", bold: false },
      { text: dateToFR, bold: true },
    ];

    const totalWidth = headerParts.reduce((sum, part) => {
      doc.setFont("helvetica", part.bold ? "bold" : "normal");
      return sum + doc.getTextWidth(part.text);
    }, 0);

    let currentX = (pageWidth - totalWidth) / 2;
    const lineY = yPos + 7;

    headerParts.forEach((part) => {
      doc.setFont("helvetica", part.bold ? "bold" : "normal");
      doc.setFontSize(11);
      doc.text(part.text, currentX, lineY);
      currentX += doc.getTextWidth(part.text);
    });
  };

  const addFooter = (data) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(10);

<<<<<<< HEAD
    const prefix = "Espace ";
    const boldPart = "DEMO PUBLIC";
    const suffix = " - adresse de demonstration";
=======
    const prefix = "Résidence ";
    const boldPart = "LA FELICITE";
    const suffix = " VB 72 ZX Ambatoroka";
>>>>>>> release/v1.0.1
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
    t.recette > 0 ? `${t.recette.toLocaleString()}\u00A0€` : '-',
    t.depense > 0 ? `${t.depense.toLocaleString()}\u00A0€` : '-',
    `${t.solde.toLocaleString()}\u00A0€`,
  ]);

  const totalRow = [
    'TOTAL',
    '',
    `${transactions.reduce((sum, t) => sum + (t.recette || 0), 0).toLocaleString()}\u00A0€`,
    `${transactions.reduce((sum, t) => sum + (t.depense || 0), 0).toLocaleString()}\u00A0€`,
    `${transactions[transactions.length - 1]?.solde.toLocaleString()}\u00A0€`,
  ];

  autoTable(doc, {
    head: [['Date', 'Libellé', 'Recettes', 'Dépenses', 'Solde'].map( header=> header.toUpperCase())],
    body: [...tableData, totalRow],
    startY: 25, // Leave space for the header
    styles: {
      fontSize: 9,
    },
    columnStyles: {
      2: { halign: 'right', cellWidth: 32, minCellWidth: 32 },
      3: { halign: 'right', cellWidth: 32, minCellWidth: 32 },
      4: { halign: 'right', cellWidth: 32, minCellWidth: 32 },
    },
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
        if (data.column.index >= 2 && data.column.index <= 4) {
          data.cell.styles.halign = 'right';
        }
      }
    },

    didDrawPage: (data) => {
      addHeader();
      addFooter(data);
    },
  });

  doc.save(`facture - ${libelle} - ${ dateFrom } ${dateTo}.pdf`);
}

export default exportPDF;

