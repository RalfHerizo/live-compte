import React, { useEffect, useState } from "react";
import { useTransactionManager } from "./hooks/useTransactionManager";
import exportPDF from "./core/finance";
import Login from "./components/Login";
import { supabase } from "./lib/supabaseClient";

function App() {
  const app_title = import.meta.env.VITE_APP_TITLE;
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const [session, setSession] = useState(null);

  const {
    transactions,
    setFilterLibelle,
    addTransaction,
    dateFilter,
    setDateFilter,
    deleteTransaction,
    loading,
    isAdding,
    isDeleting,
  } = useTransactionManager([], session);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    libelle: "",
    recette: "",
    depense: "",
  });

  const [printDetails, setPrintDetails] = useState({
    libelle: "",
    dateFrom: "",
    dateTo: "",
  });

  const [errors, setErrors] = useState({});
  const [exportErrors, setExportErrors] = useState({});
  const [searchLibelle, setSearchLibelle] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    transactionId: null,
    transactionLabel: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    let newErrors = {};

    if (!formData.libelle.trim()) {
      newErrors.libelle = "Le libellé est requis";
    }

    const recette = Number(formData.recette) || 0;
    const depense = Number(formData.depense) || 0;
    if (recette === 0 && depense === 0) {
      newErrors.montant = "Saisissez au moins un montant";
    }

    // S'il y a des erreurs, on les affiche et on arréte tout
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    addTransaction({
      ...formData,
      libelle: formData.libelle.trim().toUpperCase(),
      recette: Number(formData.recette) || 0,
      depense: Number(formData.depense) || 0,
    });

    setFormData({ ...formData, libelle: "", recette: "", depense: "" });
    setErrors({});
  };

  const handleDateModeChange = (mode) => {
    setDateFilter((prev) => ({ ...prev, mode }));
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecetteChange = (value) => {
    setFormData({ ...formData, recette: value, depense: "" });
  };

  const handleDepenseChange = (value) => {
    setFormData({ ...formData, depense: value, recette: "" });
  };

  const handleExportPDF = () => {
    let newErrors = {};

    if (
      !printDetails.libelle.trim() ||
      !printDetails.dateFrom ||
      !printDetails.dateTo
    ) {
      newErrors.general =
        "Veuillez remplir le libellé, la date de début et la date de fin avant l'exportation.";
    }

    if (
      printDetails.dateFrom &&
      printDetails.dateTo &&
      printDetails.dateFrom > printDetails.dateTo
    ) {
      newErrors.general =
        "La date de début doit étre antérieure ou égale é la date de fin.";
    }

    if (Object.keys(newErrors).length > 0) {
      setExportErrors(newErrors);
      return;
    }

    setExportErrors({});
    exportPDF(
      transactions.items,
      printDetails.libelle,
      printDetails.dateFrom,
      printDetails.dateTo
    );
  };

  const handleSearchChange = (value) => {
    setSearchLibelle(value);
    setFilterLibelle(value);
  };

  const clearSearch = () => {
    setSearchLibelle("");
    setFilterLibelle("");
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const openDeleteModal = (transaction) => {
    setDeleteModal({
      isOpen: true,
      transactionId: transaction.id,
      transactionLabel: transaction.libelle,
    });
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModal({
      isOpen: false,
      transactionId: null,
      transactionLabel: "",
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.transactionId) return;
    await deleteTransaction(deleteModal.transactionId);
    setDeleteModal({
      isOpen: false,
      transactionId: null,
      transactionLabel: "",
    });
  };

  const hasActiveFilters =
    searchLibelle.trim() !== "" ||
    dateFilter.mode !== "all" ||
    !!dateFilter.from ||
    !!dateFilter.to;

  if (!session) return <Login />;

  const isAdmin = adminEmails.includes(
    (session.user.email || "").trim().toLowerCase()
  );
  const userEmail = session.user.email || "";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-50 w-full bg-slate-900 text-slate-100  no-print">
        <div className="max-w-350 mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                {app_title}
              </h1>
              <p className="text-slate-300 text-sm">
                Gestion trésorerie en temps réel
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2 text-xs bg-slate-800 rounded border border-slate-700 px-3 py-2 max-w-44 md:max-w-xs">
                <span className="text-green-400">Connecté :</span>
                <span className="text-slate-100 truncate">{userEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowToolbar((prev) => !prev)}
                aria-expanded={showToolbar}
                aria-label="Afficher ou masquer la barre d'outils"
                className="p-2 text-slate-200 hover:bg-slate-800 hover:cursor-pointer transition-all"
              >
                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 18"
                >
                  <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`px-3 py-2 rounded text-sm font-semibold border transition-all ${
                  isSigningOut
                    ? "bg-rose-300 text-white border-0 cursor-not-allowed"
                    : "bg-rose-500 text-white border-0 hover:bg-rose-600 hover:cursor-pointer"
                }`}
              >
                {isSigningOut ? "Déconnexion..." : "Déconnexion"}
              </button>
            </div>
          </div>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 bg-slate-200 ${
            showToolbar
              ? "max-h-56 opacity-100 border-t border-slate-700"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="max-w-350 mx-auto  md:px-8 p-4">
            <div className="grid grid-cols-2 gap-3 md:items-end">
              <div className="">
                <label className="block text-xs font-bold uppercase text-slate-900 mb-2">
                  Filtrer par libelle
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchLibelle}
                    className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-50 rounded text-slate-900 placeholder:text-slate-400 outline-none"
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {searchLibelle && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-2 text-slate-400 hover:text-slate-500 hover:cursor-pointer"
                      aria-label="Effacer la recherche"
                    >
                      <svg
                        width="24"
                        height="25"
                        viewBox="0 0 24 25"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 12.3906C2 6.86778 6.47715 2.39062 12 2.39062C17.5228 2.39062 22 6.86778 22 12.3906C22 17.9135 17.5228 22.3906 12 22.3906C6.47715 22.3906 2 17.9135 2 12.3906ZM8.78362 10.2354L10.9388 12.3906L8.78362 14.5458C8.49073 14.8387 8.49073 15.3136 8.78362 15.6065C9.07652 15.8994 9.55139 15.8994 9.84428 15.6065L11.9995 13.4513L14.1546 15.6064C14.4475 15.8993 14.9224 15.8993 15.2153 15.6064C15.5082 15.3135 15.5082 14.8387 15.2153 14.5458L13.0602 12.3906L15.2153 10.2355C15.5082 9.94258 15.5082 9.46771 15.2153 9.17482C14.9224 8.88192 14.4475 8.88192 14.1546 9.17482L11.9995 11.33L9.84428 9.17475C9.55139 8.88186 9.07652 8.88186 8.78362 9.17475C8.49073 9.46764 8.49073 9.94251 8.78362 10.2354Z"
                          fill="#94A3B8"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="">
                <label className="block text-xs font-bold uppercase text-slate-900 mb-2">
                  Type date
                </label>
                <select
                  value={dateFilter.mode}
                  onChange={(e) => handleDateModeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-50 rounded text-slate-900 outline-none"
                >
                  <option value="all">Toutes</option>
                  <option value="range">Entre 2 dates</option>
                </select>
              </div>
              {/* <div className="md:col-span-3">
                <button
                  onClick={handleExportPDF}
                  className="w-full bg-slate-800 hover:bg-slate-900 hover:cursor-pointer text-slate-50 px-5 py-2.5 font-semibold transition-all rounded"
                >
                  Exporter PDF
                </button>
              </div> */}
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-350 mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1 no-print">
            <div className="bg-slate-200 rounded-lg  sticky top-8">
              <div class="flex items-center justify-between py-3 rounded-t border-b mx-3  border-slate-300">
                <div class="flex items-center gap-3">
                  <div class="bg-slate-900 flex items-center justify-center p-3 rounded-xl">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-5 "
                    >
                      <path
                        class="stroke-slate-50"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900 ">
                      Nouvelle opération
                    </h3>
                    <p class=" text-sm ">
                      Gérez vos comptes facilement.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-3 rounded ">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-900 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 rounded  outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-900 mb-1">
                    Libelle
                  </label>
                  {errors.libelle && (
                    <span className="text-rose-500 text-[10px] font-bold animate-bounce block mb-1">
                      {errors.libelle}
                    </span>
                  )}
                  <input
                    type="text"
                    minLengh="3"
                    placeholder="ex: Vente de marchandise..."
                    value={formData.libelle}
                    onChange={(e) => {
                      setFormData({ ...formData, libelle: e.target.value });
                      if (errors.libelle)
                        setErrors({ ...errors, libelle: null });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 outline-none rounded focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-emerald-600 mb-1">
                      Recette (Ar)
                    </label>

                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.recette}
                      onChange={(e) => handleRecetteChange(e.target.value)}
                      disabled={!!formData.depense}
                      className="w-full px-3 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-rose-600 mb-1">
                      Depense (Ar)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.depense}
                      onChange={(e) => handleDepenseChange(e.target.value)}
                      disabled={!!formData.recette}
                      className="w-full px-3 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div className="col-span-2">
                    {errors.montant && (
                      <span className="text-rose-500 text-[10px] font-bold block mb-1">
                        {errors.montant}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className={`w-full py-3 transition-all mt-4 flex items-center justify-center gap-2 rounded ${
                    isAdding
                      ? "bg-slate-400 cursor-not-allowed text-white"
                      : "bg-slate-900 hover:cursor-pointer hover:bg-slate-800 text-white"
                  }`}
                >
                  {isAdding ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Ajout en cours...
                    </>
                  ) : (
                    <span>Ajouter à  la liste</span>
                  )}
                </button>
              </form>
            </div>
          </aside>

          <main className="lg:col-span-3 overflow-x-auto">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {dateFilter.mode === "range" && (
                <>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                      Date debut
                    </label>
                    <input
                      type="date"
                      value={dateFilter.from}
                      onChange={(e) =>
                        handleDateFilterChange("from", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={dateFilter.to}
                      onChange={(e) =>
                        handleDateFilterChange("to", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="table-parent-container bg-white  overflow-hidden shadow-sm py-3">
              <div className="print-only">
                <h2 className="text-center mb-4">
                  {/* Résidence <strong className='uppercase'>la félicité</strong> Ambatoroaka
                  <br /> */}
                  <div className="my-3  mx-5">
                    <div className="grid grid-cols-4 items-center ">
                      <div className="col-span-3 flex items-center justify-start ">
                        Facture du
                        <input
                          type="text"
                          placeholder="Libellé"
                          value={printDetails.libelle}
                          onChange={(e) => {
                            setPrintDetails({
                              ...printDetails,
                              libelle: e.target.value,
                            });
                            if (exportErrors.general) setExportErrors({});
                          }}
                          className="mx-2 inline-block border-gray-400 bg-slate-200 outline-none text-center w-40 p-1"
                        />
                        de
                        <input
                          type="date"
                          value={printDetails.dateFrom}
                          onChange={(e) => {
                            setPrintDetails({
                              ...printDetails,
                              dateFrom: e.target.value,
                            });
                            if (exportErrors.general) setExportErrors({});
                          }}
                          className="mx-2 inline-block bg-slate-200 border-gray-400 outline-none text-center w-40 p-1"
                        />
                        au
                        <input
                          type="date"
                          value={printDetails.dateTo}
                          onChange={(e) => {
                            setPrintDetails({
                              ...printDetails,
                              dateTo: e.target.value,
                            });
                            if (exportErrors.general) setExportErrors({});
                          }}
                          className=" mx-2 inline-block bg-slate-200 border-gray-400 outline-none text-center w-40 p-1"
                        />
                      </div>
                      <div className="0">
                        <button
                          onClick={handleExportPDF}
                          className="w-full  bg-slate-800 hover:bg-slate-900 hover:cursor-pointer text-slate-50 px-5 py-2.5 font-semibold transition-all rounded"
                        >
                          Exporter PDF
                        </button>
                      </div>
                    </div>
                    {exportErrors.general && (
                      <p className="text-rose-500 text-[11px] font-bold mt-2">
                        {exportErrors.general}
                      </p>
                    )}
                  </div>
                </h2>
              </div>

              <div className="relative max-h-[90vh] overflow-y-auto border border-slate-200 ">
                <table className="w-full text-left border-collapse print:mt-6 print:pt-6">
                  <thead className="">
                    <tr className="  border-slate-200  ">
                      <th
                        className=" sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider"
                        style={{ cursor: "pointer" }}
                      >
                        Date
                      </th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider">
                        Libelle
                      </th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">
                        Recettes
                      </th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">
                        Depenses
                      </th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">
                        Solde
                      </th>
                      {isAdmin && (
                        <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 6 : 5}
                          className="px-6 py-10 text-center text-sm text-slate-500"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full"></span>
                            Chargement des données depuis le cloud...
                          </div>
                        </td>
                      </tr>
                    ) : transactions.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 6 : 5}
                          className="px-6 py-10 text-center text-sm text-slate-500"
                        >
                          {hasActiveFilters
                            ? "Aucun résultat trouvé pour les filtres actuels."
                            : "Aucune donnée pour le moment. Veuillez insérer une opération."}
                        </td>
                      </tr>
                    ) : (
                      transactions.items.map((t) => (
                        <tr
                          key={t.id}
                          className="odd:bg-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap text-sm">
                            {new Date(t.date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 text-sm italic">
                            {t.libelle.toUpperCase()}
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-bold text-sm">
                            {t.recette > 0
                              ? `${t.recette.toLocaleString()} Ar`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-right text-rose-600 font-bold text-sm">
                            {t.depense > 0
                              ? `${t.depense.toLocaleString()} Ar`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30 text-sm">
                            {t.solde.toLocaleString()} Ar
                          </td>
                          {isAdmin && (
                            <td className="px-2">
                              {" "}
                              <button
                                disabled={isDeleting}
                                className={`text-center w-full uppercase py-2 text-xs text-gray-50 rounded ${
                                  isDeleting
                                    ? "bg-red-300 cursor-not-allowed"
                                    : "bg-red-500 hover:bg-red-600 hover:cursor-pointer"
                                }`}
                                key={t.id}
                                onClick={() => openDeleteModal(t)}
                              >
                                supprimer
                              </button>{" "}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!loading && transactions.items.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold">
                        <td colSpan="2" className="px-6 py-5 text-sm bold">
                          TOTAL
                        </td>
                        <td className="px-6 py-5 text-right text-emerald-400 bold">
                          {transactions.totalRecettes.toLocaleString()} Ar
                        </td>
                        <td className="px-6 py-5 text-right text-rose-400 bold">
                          {transactions.totalDepenses.toLocaleString()} Ar
                        </td>
                        <td className="px-6 py-5 text-right bold">
                          {transactions.soldeFinal.toLocaleString()} Ar
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-5 text-right bold"></td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {/* <footer id='pdf-footer' className="print-only mt-3 text-sm print:fixed print:bottom-8 print:w-full print:text-center print:bg-red-500">
                <p className='text-center' >Résidence <strong className='uppercase' >la félicité</strong>, bis au Lot VB 72 ZX Ambatoroaka.</p>
              </footer> */}
            </div>
          </main>
        </div>
      </div>
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 no-print">
          <div className="w-full max-w-md overflow-hidden bg-white shadow-xl border border-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-bold uppercase text-slate-900">
                Confirmer la suppression
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Voulez-vous vraiment supprimer l&apos;operation
                {deleteModal.transactionLabel ? (
                  <span className="font-semibold text-slate-900">
                    {" "}
                    {deleteModal.transactionLabel}
                  </span>
                ) : (
                  ""
                )}{" "}
                ?
              </p>
            </div>
            <div className="flex justify-end gap-3 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className={`px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 ${
                  isDeleting
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-slate-100 hover:cursor-pointer"
                }`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className={`px-4 py-2 text-sm font-semibold text-white ${
                  isDeleting
                    ? "bg-rose-300 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-700 hover:cursor-pointer"
                }`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {isDeleting && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center no-print">
          <div className="bg-white px-6 py-4 shadow-lg flex items-center gap-3 text-slate-700">
            <span className="animate-spin inline-block w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full"></span>
            Suppression en cours...
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
