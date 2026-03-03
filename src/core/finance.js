import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Calcule le solde cumule pour chaque transaction.
 * @param {Array} transactions - Liste brute (date, libelle, recette, depense)
 * @returns {Array} - Liste enrichie de la propriete "solde"
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

  const items = sorted.map((transaction) => {
    const recette = Number(transaction.recette) || 0;
    const depense = Number(transaction.depense) || 0;

    totalRecettes += recette;
    totalDepenses += depense;
    runningBalance += recette - depense;

    return {
      ...transaction,
      solde: runningBalance,
    };
  });

  return {
    items,
    totalRecettes,
    totalDepenses,
    soldeFinal: runningBalance,
  };
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatAmountForPdf = (value) => {
  const amount = Number(value) || 0;
  const localized = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const safeSpacing = localized.replace(/[\u00A0\u202F]/g, ' ');
  return `${safeSpacing} Ar`;
};

function exportPDF(transactions, libelle, dateFrom, dateTo) {
  const doc = new jsPDF();

  const dateFromFR = formatDate(dateFrom);
  const dateToFR = formatDate(dateTo);

  const addHeader = () => {
    const pageWidth = doc.internal.pageSize.width;
    const yPos = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Résidence ', 65, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('LA FELICITE', 86, yPos);

    doc.setFont('helvetica', 'normal');
    doc.text('Ambatoroka', 118, yPos);

    const headerParts = [
      { text: 'Facture du ', bold: false },
      { text: libelle, bold: true },
      { text: ' de ', bold: false },
      { text: dateFromFR, bold: true },
      { text: ' au ', bold: false },
      { text: dateToFR, bold: true },
    ];

    const totalWidth = headerParts.reduce((sum, part) => {
      doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
      return sum + doc.getTextWidth(part.text);
    }, 0);

    let currentX = (pageWidth - totalWidth) / 2;
    const lineY = yPos + 7;

    headerParts.forEach((part) => {
      doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
      doc.setFontSize(11);
      doc.text(part.text, currentX, lineY);
      currentX += doc.getTextWidth(part.text);
    });
  };

  const addFooter = () => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(10);

    const prefix = 'Résidence ';
    const boldPart = 'LA FELICITE';
    const suffix = ' VB 72 ZX Ambatoroka';
    const totalWidth = doc.getTextWidth(prefix + boldPart + suffix);
    let currentX = (pageWidth - totalWidth) / 2;

    doc.setFont('helvetica', 'normal');
    doc.text(prefix, currentX, pageHeight - 10);
    currentX += doc.getTextWidth(prefix);

    doc.setFont('helvetica', 'bold');
    doc.text(boldPart, currentX, pageHeight - 10);
    currentX += doc.getTextWidth(boldPart);

    doc.setFont('helvetica', 'normal');
    doc.text(suffix, currentX, pageHeight - 10);
  };

  const tableData = transactions.map((t) => [
    new Date(t.date).toLocaleDateString('fr-FR'),
    String(t.libelle || '').toUpperCase(),
    Number(t.recette) > 0 ? formatAmountForPdf(t.recette) : '-',
    Number(t.depense) > 0 ? formatAmountForPdf(t.depense) : '-',
    formatAmountForPdf(t.solde),
  ]);

  const totalRow = [
    'TOTAL',
    '',
    formatAmountForPdf(transactions.reduce((sum, t) => sum + (Number(t.recette) || 0), 0)),
    formatAmountForPdf(transactions.reduce((sum, t) => sum + (Number(t.depense) || 0), 0)),
    formatAmountForPdf(transactions[transactions.length - 1]?.solde ?? 0),
  ];

  autoTable(doc, {
    head: [['Date', 'Libelle', 'Recettes', 'Depenses', 'Solde'].map((header) => header.toUpperCase())],
    body: [...tableData, totalRow],
    startY: 25,
    styles: {
      fontSize: 9,
    },
    columnStyles: {
      2: { halign: 'right', cellWidth: 32, minCellWidth: 32 },
      3: { halign: 'right', cellWidth: 32, minCellWidth: 32 },
      4: { halign: 'right', cellWidth: 32, minCellWidth: 32 },
    },
    headStyles: {
      fillColor: [26, 26, 26],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    margin: { top: 25, bottom: 25 },
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
    didDrawPage: () => {
      addHeader();
      addFooter();
    },
  });

  doc.save(`facture - ${libelle} - ${dateFrom} ${dateTo}.pdf`);
}

export default exportPDF;
