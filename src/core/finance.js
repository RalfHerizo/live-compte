/**
 * Calcule le solde cumulé pour chaque transaction.
 * @param {Array} transactions - Liste brute (date, libelle, recette, depense)
 * @returns {Array} - Liste enrichie de la propriété 'solde'
 */
export const computeBalances = (transactions) => {
    let runningBalance = 0;
  
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  
    return sorted.map((transaction) => {
      const recette = Number(transaction.recette) || 0;
      const depense = Number(transaction.depense) || 0;
      
      runningBalance += (recette - depense);
  
      return {
        ...transaction,
        solde: runningBalance,
      };
    });
  };

// export default computeBalances;