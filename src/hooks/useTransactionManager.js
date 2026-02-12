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
    const transactionWithId = {
      ...newTransaction,
      id: Date.now(),
      date: newTransaction.date || new Date().toISOString().split("T")[0],
    };
    setTransactions((prev) => [...prev, transactionWithId]);
  };

  return {
    transactions: processedData,
    setFilterLibelle,
    dateFilter,
    setDateFilter,
    addTransaction,
  };
};

// export default useTransactionManager;
