import { useState, useMemo } from "react";
import {computeBalances} from "../core/finance";

export const useTransactionManager = (initialData = []) => {
  
  const [transactions, setTransactions] = useState(initialData);
  const [filterLibelle, setFilterLibelle] = useState("");

  const processedData = useMemo(() => {
    const filtered = transactions.filter((transaction) =>
      transaction.libelle.toLowerCase().includes(filterLibelle.toLowerCase())
    );

    return computeBalances(filtered);
  }, [transactions, filterLibelle]);

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
    addTransaction,
  };
};

// export default useTransactionManager;