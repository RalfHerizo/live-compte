import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { computeBalances, filterTransactionsByDate } from "../core/finance";

export const useTransactionManager = (initialData = [], session = null) => {
  const [transactions, setTransactions] = useState(initialData);
  const [filterLibelle, setFilterLibelle] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    mode: "all",
    month: "",
    from: "",
    to: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!session) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: true });

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error("Erreur lors de la récupération:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [session]);

  const processedData = useMemo(() => {
    const filteredByLibelle = transactions.filter((transaction) =>
      transaction.libelle.toLowerCase().includes(filterLibelle.toLowerCase())
    );

    const filteredByDate = filterTransactionsByDate(filteredByLibelle, dateFilter);

    return computeBalances(filteredByDate);
  }, [transactions, filterLibelle, dateFilter]);

  const addTransaction = async (newTransaction) => {
    if (!newTransaction.libelle.trim()) return;

    const recette = Number(newTransaction.recette) || 0;
    const depense = Number(newTransaction.depense) || 0;

    if (recette === 0 && depense === 0) {
      alert("Veuillez saisir un montant (Recette ou Dépense).");
      return;
    }

    const transactionToSave = {
      libelle: newTransaction.libelle.trim().toUpperCase(),
      recette,
      depense,
      date: newTransaction.date || new Date().toISOString().split("T")[0],
    };

    try {
      setIsAdding(true);
      const { data, error } = await supabase
        .from("transactions")
        .insert([transactionToSave])
        .select();

      if (error) throw error;

      setTransactions((prev) => [...prev, data[0]]);
    } catch (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const deleteTransactions = async (ids = []) => {
    const idsToDelete = [...new Set(ids)].filter(Boolean);
    if (idsToDelete.length === 0) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      setTransactions((prev) =>
        prev.filter((transaction) => !idsToDelete.includes(transaction.id))
      );
    } catch (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteTransaction = async (id) => {
    await deleteTransactions([id]);
  };

  return {
    transactions: processedData,
    filterLibelle,
    setFilterLibelle,
    dateFilter,
    setDateFilter,
    addTransaction,
    deleteTransaction,
    deleteTransactions,
    loading,
    isAdding,
    isDeleting,
  };
};
