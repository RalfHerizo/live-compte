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

  const header = `Résidence la félicité Ambatoroaka. Facture du ${libelle} de ${dateFrom} au ${dateTo}`;

  autoTable(doc, {
    head: [['Date', 'Libellé', 'Recettes', 'Dépenses', 'Solde']],
    body: transactions.map((t) => [
      new Date(t.date).toLocaleDateString('fr-FR'),
      t.libelle,
      t.recette > 0 ? `${t.recette.toLocaleString()} Ar` : '-',
      t.depense > 0 ? `${t.depense.toLocaleString()} Ar` : '-',
      t.solde.toLocaleString() + ' Ar',
    ]),
    startY: 20, // Leave space for the header
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.width;
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(header, pageWidth / 2, 10, { align: 'center' });

      // Add page number at the bottom
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Page ${data.pageNumber} / ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
    },
    margin: { top: 20 }, // Ensure the table doesn't overlap the header
  });

  doc.save('facture.pdf');
}

export default exportPDF;
