import { useState, useMemo, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import { computeBalances, filterTransactionsByDate } from "../core/finance";

export const useTransactionManager = (initialData = []) => {
  const [transactions, setTransactions] = useState(initialData);
  const [filterLibelle, setFilterLibelle] = useState("");
  const [loading, setLoading] = useState(true); // Pour gérer l'état de chargement
  const [dateFilter, setDateFilter] = useState({
    mode: "all",
    month: "",
    from: "",
    to: "",
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Charger les données au démarrage
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error("Erreur lors de la récupération:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // 2. Logique de filtrage et calcul (inchangée, mais réactive aux données de la DB)
  const processedData = useMemo(() => {
    const filteredByLibelle = transactions.filter((transaction) =>
      transaction.libelle.toLowerCase().includes(filterLibelle.toLowerCase())
    );

    const filteredByDate = filterTransactionsByDate(filteredByLibelle, dateFilter);

    return computeBalances(filteredByDate);
  }, [transactions, filterLibelle, dateFilter]);

  // 3. Ajouter une transaction sur Supabase
  const addTransaction = async (newTransaction) => {
    if (!newTransaction.libelle.trim()) return;

    const recette = Number(newTransaction.recette) || 0;
    const depense = Number(newTransaction.depense) || 0;
    
    if (recette === 0 && depense === 0) {
      alert("Veuillez saisir un montant (Recette ou Dépense).");
      return;
    }

    // Préparation de l'objet pour la DB (Supabase génère l'ID uuid automatiquement)
    const transactionToSave = {
      libelle: newTransaction.libelle.trim().toUpperCase(),
      recette,
      depense,
      date: newTransaction.date || new Date().toISOString().split("T")[0],
    };

    try {
      setIsAdding(true);
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionToSave])
        .select();

      if (error) throw error;
      
      // Mise à jour de l'état local avec l'objet retourné par la DB (qui contient l'ID)
      setTransactions((prev) => [...prev, data[0]]);
    } catch (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  // 4. Supprimer une transaction sur Supabase
  const deleteTransaction = async (id) => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Mise à jour de l'état local
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    transactions: processedData,
    filterLibelle, // Ajouté pour ton bouton "X" de nettoyage
    setFilterLibelle,
    dateFilter,
    setDateFilter,
    addTransaction,
    deleteTransaction,
    loading, // Tu peux l'utiliser pour afficher un message "Chargement..." dans ton tableau
    isAdding,
    isDeleting
  };
};
