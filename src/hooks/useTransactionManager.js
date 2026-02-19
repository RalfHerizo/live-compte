import { useState, useMemo } from "react";
import { computeBalances, filterTransactionsByDate } from "../core/finance";

export const useTransactionManager = (initialData = []) => {
  
  const [transactions, setTransactions] = useState(initialData);
  const [filterLibelle, setFilterLibelle] = useState("");
  const [dateFilter, setDateFilter] = useState({
    mode: "all",
    month: "",
    from: "",
    to: "",
  });

  const processedData = useMemo(() => {
    const filteredByLibelle = transactions.filter((transaction) =>
      transaction.libelle.toLowerCase().includes(filterLibelle.toLowerCase())
    );

    const filteredByDate = filterTransactionsByDate(filteredByLibelle, dateFilter);

    return computeBalances(filteredByDate);
  }, [transactions, filterLibelle, dateFilter]);

  const addTransaction = (newTransaction) => {
    
    if (!newTransaction.libelle.trim()) return;

    const recette = Number(newTransaction.recette) || 0;
    const depense = Number(newTransaction.depense) || 0;
    
    if (recette === 0 && depense === 0) {
      alert("Veuillez saisir un montant (Recette ou Dépense).");
      return;
    }

    const transactionWithId = {
      ...newTransaction,
      recette,
      depense,
      id: Date.now(),
      date: newTransaction.date || new Date().toISOString().split("T")[0],
    };
    
    setTransactions((prev) => [...prev, transactionWithId]);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return {
    transactions: processedData,
    setFilterLibelle,
    dateFilter,
    setDateFilter,
    addTransaction,
    deleteTransaction,
  };
};

// export default useTransactionManager;
