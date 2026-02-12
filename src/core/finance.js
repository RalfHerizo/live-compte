/**
 * Calcule le solde cumulé pour chaque transaction.
 * @param {Array} transactions - Liste brute (date, libelle, recette, depense)
 * @returns {Array} - Liste enrichie de la propriété 'solde'
 */
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

// export default computeBalances;
