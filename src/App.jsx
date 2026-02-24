import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTransactionManager } from "./hooks/useTransactionManager";
import { usePagination } from "./hooks/usePagination";
import { Toaster, toast } from "react-hot-toast";
import exportPDF from "./core/finance";
import Login from "./components/Login";
import { supabase } from "./lib/supabaseClient";
import {
  PASSWORD_CHANGE_RELOGIN_NOTICE,
  PASSWORD_CHANGE_RELOGIN_NOTICE_KEY,
} from "./constants/auth";

function App() {
  const app_title = import.meta.env.VITE_APP_TITLE;
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const {
    transactions,
    setFilterLibelle,
    addTransaction,
    dateFilter,
    setDateFilter,
    deleteTransaction,
    deleteTransactions,
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
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [accountModal, setAccountModal] = useState({
    isOpen: false,
    currentPassword: "",
    newPassword: "",
    errors: {},
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    mode: "single",
    transactionIds: [],
    transactionLabel: "",
  });
  const selectAllRef = useRef(null);
  const userMenuRef = useRef(null);

  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    handleRowsPerPageChange,
    totalItems,
    totalPages,
    currentData,
    displayStart,
    displayEnd,
    showPaginationControls,
    resetPagination,
  } = usePagination(transactions.items, { initialRowsPerPage: 20 });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleIds = useMemo(() => currentData.map((item) => item.id), [currentData]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id));
  const selectedCount = selectedIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
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

    try {
      await addTransaction({
        ...formData,
        libelle: formData.libelle.trim().toUpperCase(),
        recette: Number(formData.recette) || 0,
        depense: Number(formData.depense) || 0,
      });

      setFormData({ ...formData, libelle: "", recette: "", depense: "" });
      setErrors({});
      toast.success("Transaction enregistrée !");
    } catch (error) {
      toast.error("Erreur : " + (error?.message || "Échec de l'enregistrement"));
    }
  };

  const handleDateModeChange = (mode) => {
    setDateFilter((prev) => ({ ...prev, mode }));
    resetPagination();
    setSelectedIds([]);
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter((prev) => ({ ...prev, [field]: value }));
    resetPagination();
    setSelectedIds([]);
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
    resetPagination();
    setSelectedIds([]);
  };

  const clearSearch = () => {
    setSearchLibelle("");
    setFilterLibelle("");
    resetPagination();
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (visibleIds.length === 0) return;

    setSelectedIds((prev) => {
      const prevSet = new Set(prev);

      if (visibleIds.every((id) => prevSet.has(id))) {
        return prev.filter((id) => !visibleIds.includes(id));
      }

      visibleIds.forEach((id) => prevSet.add(id));
      return Array.from(prevSet);
    });
  };

  const openBulkDeleteModal = () => {
    if (selectedCount === 0) return;
    setDeleteModal({
      isOpen: true,
      mode: "bulk",
      transactionIds: selectedIds,
      transactionLabel: "",
    });
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const openAccountModal = () => {
    if (!isAdmin) return;
    setShowUserMenu(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setAccountModal({
      isOpen: true,
      currentPassword: "",
      newPassword: "",
      errors: {},
    });
  };

  const closeAccountModal = () => {
    if (isUpdatingPassword) return;
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setAccountModal({
      isOpen: false,
      currentPassword: "",
      newPassword: "",
      errors: {},
    });
  };

  const handlePasswordFieldChange = (field, value) => {
    setAccountModal((prev) => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: "",
      },
    }));
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();

    const currentPassword = accountModal.currentPassword.trim();
    const newPassword = accountModal.newPassword.trim();
    const errors = {};

    if (!currentPassword) {
      errors.currentPassword = "Le mot de passe actuel est requis.";
    }

    if (!newPassword) {
      errors.newPassword = "Le nouveau mot de passe est requis.";
    } else if (newPassword.length < 6) {
      errors.newPassword = "Le nouveau mot de passe doit contenir au moins 6 caractères.";
    } else if (newPassword === currentPassword) {
      errors.newPassword =
        "Le nouveau mot de passe doit être différent du mot de passe actuel.";
    }

    if (Object.keys(errors).length > 0) {
      setAccountModal((prev) => ({ ...prev, errors }));
      return;
    }

    try {
      setIsUpdatingPassword(true);

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (verifyError) {
        setAccountModal((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            currentPassword: "Mot de passe actuel incorrect.",
          },
        }));
        toast.error("Mot de passe actuel incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Erreur : " + (updateError.message || "Échec de la mise à jour."));
        return;
      }

      setAccountModal({
        isOpen: false,
        currentPassword: "",
        newPassword: "",
        errors: {},
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);

      sessionStorage.setItem(
        PASSWORD_CHANGE_RELOGIN_NOTICE_KEY,
        PASSWORD_CHANGE_RELOGIN_NOTICE
      );

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        sessionStorage.removeItem(PASSWORD_CHANGE_RELOGIN_NOTICE_KEY);
        toast.error("Erreur : " + (signOutError.message || "Échec de la déconnexion."));
      }
    } catch (error) {
      toast.error("Erreur : " + (error?.message || "Échec de la mise à jour."));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const openDeleteModal = (transaction) => {
    setDeleteModal({
      isOpen: true,
      mode: "single",
      transactionIds: [transaction.id],
      transactionLabel: transaction.libelle,
    });
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModal({
      isOpen: false,
      mode: "single",
      transactionIds: [],
      transactionLabel: "",
    });
  };

  const confirmDelete = async () => {
    if (deleteModal.transactionIds.length === 0) return;

    const idsToDelete = [...deleteModal.transactionIds];

    try {
      if (deleteModal.mode === "bulk") {
        await deleteTransactions(idsToDelete);
      } else {
        await deleteTransaction(idsToDelete[0]);
      }

      setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      setDeleteModal({
        isOpen: false,
        mode: "single",
        transactionIds: [],
        transactionLabel: "",
      });
      toast.success("Suppression effectuée");
    } catch (error) {
      toast.error("Erreur : " + (error?.message || "Échec de la suppression"));
    }
  };

  const hasActiveFilters =
    searchLibelle.trim() !== "" ||
    dateFilter.mode !== "all" ||
    !!dateFilter.from ||
    !!dateFilter.to;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-100">
          <span className="animate-spin inline-block w-10 h-10 border-4 border-slate-300 border-t-transparent rounded-full"></span>
          <p className="text-sm tracking-wide">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  const isAdmin = adminEmails.includes(
    (session.user.email || "").trim().toLowerCase()
  );
  const userEmail = session.user.email || "";
  const userAvatar = isAdmin ? "https://img.freepik.com/vecteurs-premium/jeune-homme-mexicain-detendu-debout-illustration-avatar-vectoriel-2d-gars-joyeux-visage-personnage-dessin-anime-latino-americain-photo-tete-positive-confiante-posant-couleur-plate-image-profil-utilisateur-isolee-blanc_151150-21145.jpg?ga=GA1.1.1249139299.1762579352&semt=ais_user_personalization&w=740&q=80": "https://flowbite.com/docs/images/people/profile-picture-5.jpg";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #334155",
          },
          success: {
            style: {
              border: "1px solid #16a34a",
            },
            iconTheme: {
              primary: "#16a34a",
              secondary: "#f8fafc",
            },
          },
          error: {
            style: {
              border: "1px solid #dc2626",
            },
            iconTheme: {
              primary: "#dc2626",
              secondary: "#f8fafc",
            },
          },
        }}
      />
      <header className="w-full bg-slate-900 text-slate-100  no-print">
        <div className="max-w-350 mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/raoelison-logo-light.png"
                alt="Logo Raoelison"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                  {app_title}
                </h1>
                <p className="text-slate-300 text-sm">
                  Gestion trésorerie en temps réel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setShowToolbar((prev) => !prev)}
                aria-expanded={showToolbar}
                aria-label="Afficher ou masquer la barre d'outils"
                className={`p-2 border transition-all hover:cursor-pointer rounded ${
                  showToolbar
                    ? "text-slate-50 bg-slate-700 border-slate-600"
                    : "text-slate-200 border-transparent hover:bg-slate-800"
                }`}
              >
                <svg
                  className={`w-4 h-4 transition-transform`}
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 18"
                >
                  <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
                </svg>
              </button>
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                  aria-label="Ouvrir le menu utilisateur"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-green-500 bg-slate-800 text-sm font-semibold text-slate-100 transition-all hover:cursor-pointer hover:bg-slate-700"
                >
                  <img
                    src={userAvatar}
                    alt="Photo de profil"
                    className="h-full w-full rounded-full border-2 border-green-500 object-cover"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-slate-900 bg-green-400"></span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded border border-slate-700 bg-slate-800 shadow-lg">
                    <div className="border-b border-slate-700 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={userAvatar}
                            alt="Utilisateur connecté"
                            className="h-8 w-8 rounded-full border-2 border-green-500 object-cover"
                          />
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-slate-900 bg-green-400"></span>
                        </div>
                        <span className="block text-sm text-slate-200 truncate">{userEmail}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <ul className="py-1 text-sm text-slate-200" role="menu">
                        <li>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={openAccountModal}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-slate-700 hover:cursor-pointer"
                          >
                            <svg
                              width="24"
                              height="25"
                              viewBox="0 0 24 25"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                className="fill-slate-50"
                                d="M3.39854 12.1458C2.33012 11.5289 1.96404 10.1627 2.5809 9.09428L4.09689 6.4685C4.71388 5.39984 6.08042 5.03388 7.14894 5.65079C7.63842 5.9334 8.25011 5.58009 8.25011 5.01524C8.25011 3.78144 9.2503 2.78125 10.4841 2.78125H13.5165C14.7502 2.78125 15.7501 3.78149 15.7501 5.01502C15.7501 5.57981 16.3615 5.93263 16.8503 5.65041C17.9185 5.03366 19.2845 5.39967 19.9012 6.46792L21.4176 9.09435C22.0345 10.1628 21.6684 11.5289 20.6 12.1458C20.1108 12.4282 20.1108 13.1343 20.6 13.4167C21.6684 14.0336 22.0344 15.3998 21.4176 16.4682L19.9012 19.0946C19.2845 20.1629 17.9185 20.5289 16.8503 19.9121C16.3615 19.6299 15.7501 19.9827 15.7501 20.5475C15.7501 21.781 14.7502 22.7812 13.5165 22.7812H10.4841C9.2503 22.7812 8.25011 21.7811 8.25011 20.5473C8.25011 19.9824 7.63844 19.6291 7.14896 19.9117C6.08044 20.5286 4.71391 20.1627 4.09692 19.094L2.58092 16.4682C1.96407 15.3998 2.33013 14.0336 3.39856 13.4168C3.88776 13.1343 3.88777 12.4282 3.39854 12.1458ZM11.9992 8.94618C9.88118 8.94618 8.16419 10.6632 8.16419 12.7812C8.16419 14.8992 9.88118 16.6162 11.9992 16.6162C14.1172 16.6162 15.8342 14.8992 15.8342 12.7812C15.8342 10.6632 14.1172 8.94618 11.9992 8.94618Z"
                              />
                            </svg>
                            Paramètre du compte
                          </button>
                        </li>
                      </ul>
                    )}
                    <div className="border-t border-slate-700 p-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className={`w-full rounded px-3 py-2 text-center text-sm font-semibold border transition-all ${
                          isSigningOut
                            ? "bg-rose-300 text-white border-0 cursor-not-allowed"
                            : "bg-rose-500 text-white border-0 hover:bg-rose-600 hover:cursor-pointer"
                        }`}
                      >
                        {isSigningOut ? "Déconnexion..." : "Déconnexion"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-end">
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
              </div>
              <div className="grid grid-cols-2 gap-3 my-3">
                {dateFilter.mode === "range" && (
                  <>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold uppercase text-slate-900 mb-2">
                        Date debut
                      </label>
                      <input
                        type="date"
                        value={dateFilter.from}
                        onChange={(e) =>
                          handleDateFilterChange("from", e.target.value)
                        }
                        className="w-full px-3 py-2 text-slate-900 bg-slate-50 border border-slate-200 outline-none"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold uppercase text-slate-900 mb-2">
                        Date fin
                      </label>
                      <input
                        type="date"
                        value={dateFilter.to}
                        onChange={(e) =>
                          handleDateFilterChange("to", e.target.value)
                        }
                        className="w-full px-3 py-2 text-slate-900 bg-slate-50 border border-slate-200 outline-none"
                      />
                    </div>
                  </>
                )}
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
          {isAdmin && (
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
                    <p class=" text-sm ">Gérez vos comptes facilement.</p>
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
                      className="rounded w-full px-3 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="rounded w-full px-3 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500"
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
          )}

          <main className={`${isAdmin ? "lg:col-span-3" : "lg:col-span-4"} overflow-x-auto`}>
            <div className="table-parent-container bg-slate-200 rounded overflow-hidden shadow-sm ">
              {isAdmin && (
                <div className="print-only bg-slate-900 py-3">
                  <h2 className="text-center">
                    {/* Résidence <strong className='uppercase'>la félicité</strong> Ambatoroaka
                    <br /> */}
                    <div className="  mx-5 ">
                      <div className="grid grid-cols-4 items-center ">
                        <div className="col-span-3 flex items-center justify-start text-slate-50 ">
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
                            className="text-slate-900 mx-2 inline-block border-gray-400 bg-slate-100 outline-none text-center w-40 p-1 rounded"
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
                            className=" text-slate-900 mx-2 inline-block bg-slate-100 border-gray-400 outline-none text-center w-40 p-1 rounded"
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
                            className=" text-slate-900 mx-2 inline-block bg-slate-100 border-gray-400 outline-none text-center w-40 p-1 rounded"
                          />
                        </div>
                        <div className="0">
                          <button
                            onClick={handleExportPDF}
                            className="w-full  bg-blue-500 hover:bg-blue-600 hover:cursor-pointer text-slate-50 px-5 py-2.5 font-semibold transition-all rounded"
                          >
                            Exporter PDF
                          </button>
                        </div>
                      </div>
                      {exportErrors.general && (
                        <p className="text-rose-500 text-left text-[11px] font-bold mt-2">
                          {exportErrors.general}
                        </p>
                      )}
                    </div>
                  </h2>
                </div>
              )}

              <div className="px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 no-print">
                <div className="flex items-center gap-2">
                  <select
                    id="rows-per-page"
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 outline-none"
                  >
                    <option value="all">Tout afficher</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                      <option value={50}>50</option>
                  </select>
                  {isAdmin && (
                    <div
                      className={`transition-all duration-300 ${
                        selectedCount > 0
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 -translate-y-1 pointer-events-none"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={openBulkDeleteModal}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700 hover:cursor-pointer"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            className="fill-slate-50"
                            d="M14.7223 12.7585C14.7426 12.3448 14.4237 11.9929 14.01 11.9726C13.5963 11.9522 13.2444 12.2711 13.2241 12.6848L12.9999 17.2415C12.9796 17.6552 13.2985 18.0071 13.7122 18.0274C14.1259 18.0478 14.4778 17.7289 14.4981 17.3152L14.7223 12.7585Z"
                          />
                          <path
                            className="fill-slate-50"
                            d="M9.98802 11.9726C9.5743 11.9929 9.25542 12.3448 9.27577 12.7585L9.49993 17.3152C9.52028 17.7289 9.87216 18.0478 10.2859 18.0274C10.6996 18.0071 11.0185 17.6552 10.9981 17.2415L10.774 12.6848C10.7536 12.2711 10.4017 11.9522 9.98802 11.9726Z"
                          />
                          <path
                            className="fill-slate-50"
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M10.249 2C9.00638 2 7.99902 3.00736 7.99902 4.25V5H5.5C4.25736 5 3.25 6.00736 3.25 7.25C3.25 8.28958 3.95503 9.16449 4.91303 9.42267L5.54076 19.8848C5.61205 21.0729 6.59642 22 7.78672 22H16.2113C17.4016 22 18.386 21.0729 18.4573 19.8848L19.085 9.42267C20.043 9.16449 20.748 8.28958 20.748 7.25C20.748 6.00736 19.7407 5 18.498 5H15.999V4.25C15.999 3.00736 14.9917 2 13.749 2H10.249ZM14.499 5V4.25C14.499 3.83579 14.1632 3.5 13.749 3.5H10.249C9.83481 3.5 9.49902 3.83579 9.49902 4.25V5H14.499ZM5.5 6.5C5.08579 6.5 4.75 6.83579 4.75 7.25C4.75 7.66421 5.08579 8 5.5 8H18.498C18.9123 8 19.248 7.66421 19.248 7.25C19.248 6.83579 18.9123 6.5 18.498 6.5H5.5ZM6.42037 9.5H17.5777L16.96 19.7949C16.9362 20.191 16.6081 20.5 16.2113 20.5H7.78672C7.38995 20.5 7.06183 20.191 7.03807 19.7949L6.42037 9.5Z"
                          />
                        </svg>
                        Supprimer ({selectedCount})
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-slate-900" >
                  Affichage de <strong>{displayStart}</strong> à <strong>{displayEnd}</strong> sur{" "}
                  <strong>{totalItems}</strong> entrées
                </span>
              </div>

              <div className="md:top-24 z-10 max-h-[90vh] overflow-y-auto border border-slate-200 ">
                <table className="w-full text-left border-collapse print:mt-6 print:pt-6">
                  <thead className="">
                    <tr className="  border-slate-200  ">
                      {isAdmin && (
                        <th className="sticky top-0 bg-slate-900 px-4 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider w-12">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            disabled={isDeleting || visibleIds.length === 0}
                            className="h-4 w-4 accent-slate-700 cursor-pointer"
                            aria-label="Sélectionner toutes les lignes visibles"
                          />
                        </th>
                      )}
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
                      Array.from({ length: 8 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="animate-pulse odd:bg-slate-100">
                          {isAdmin && (
                            <td className="px-4 py-4">
                              <div className="h-4 w-4 rounded bg-slate-300"></div>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="h-4 w-24 rounded bg-slate-300"></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-40 rounded bg-slate-300"></div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="ml-auto h-4 w-20 rounded bg-slate-300"></div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="ml-auto h-4 w-20 rounded bg-slate-300"></div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="ml-auto h-4 w-24 rounded bg-slate-300"></div>
                          </td>
                          {isAdmin && (
                            <td className="px-2 py-4">
                              <div className="ml-auto h-8 w-24 rounded bg-slate-300"></div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : totalItems === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 7 : 5}
                          className="px-6 py-10 text-center text-sm text-slate-500"
                        >
                          {hasActiveFilters
                            ? "Aucun résultat trouvé pour les filtres actuels."
                            : "Aucune donnée pour le moment. Veuillez insérer une opération."}
                        </td>
                      </tr>
                    ) : (
                      currentData.map((t) => (
                        <tr
                          key={t.id}
                          className={`transition-colors ${
                            selectedSet.has(t.id)
                              ? "bg-blue-100 odd:bg-blue-200 hover:bg-blue-100"
                              : "odd:bg-slate-100 hover:bg-slate-300"
                          }`}
                        >
                          {isAdmin && (
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedSet.has(t.id)}
                                onChange={() => toggleSelect(t.id)}
                                disabled={isDeleting}
                                className="h-4 w-4 accent-slate-700 cursor-pointer"
                                aria-label={`Sélectionner ${t.libelle}`}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap text-sm ">
                            {new Date(t.date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 text-xs italic">
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
                          <td className="px-6 py-4 text-right font-black text-slate-900  text-sm">
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
                  {!loading && totalItems > 0 && (
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold">
                        <td
                          colSpan={isAdmin ? 3 : 2}
                          className="rounded-bl px-6 py-5 text-sm bold"
                        >
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
                          <td className="px-6 py-5 text-right bold rounded-br"></td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <div className="px-4 md:px-6 py-4 space-y-3 flex items-center justify-between">
                <div className="flex flex-wrap items-center justify-start gap-3 no-print">
                  <div className="text-sm text-slate-900">
                    Affichage de <strong>{displayStart}</strong> à{" "}
                    <strong>{displayEnd}</strong> sur <strong>{totalItems}</strong>{" "}
                    entrées
                  </div>
                </div>
                {!loading && totalItems > 0 && (
                  <div className="no-print flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        id="rows-per-page"
                        value={rowsPerPage}
                        onChange={(e) => handleRowsPerPageChange(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 outline-none"
                      >
                        <option value="all">Tout afficher</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                      {isAdmin && (
                        <div
                          className={`transition-all duration-300 ${
                            selectedCount > 0
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 -translate-y-1 pointer-events-none"
                          }`}
                        >
                        </div>
                      )}
                    </div>
                    {showPaginationControls && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 text-sm border rounded transition-colors ${
                            currentPage === 1
                              ? "text-slate-200 bg-slate-500 border-slate-500 cursor-not-allowed"
                              : "text-slate-50 bg-slate-800 border-slate-800 hover:bg-slate-700 hover:border-slate-700 hover:cursor-pointer"
                          }`}
                        >
                          Premier
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 text-sm border rounded transition-colors ${
                            currentPage === 1
                              ? "text-slate-200 bg-slate-500 border-slate-500 cursor-not-allowed"
                              : "text-slate-50 bg-slate-800 border-slate-800 hover:bg-slate-700 hover:border-slate-700 hover:cursor-pointer"
                          }`}
                        >
                          {"<"} Précédent
                        </button>
                        <span className="px-3 py-2 text-sm text-slate-100 bg-slate-900 border border-slate-800 rounded">
                          Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                          }
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 text-sm border rounded transition-colors ${
                            currentPage === totalPages
                              ? "text-slate-200 bg-slate-500 border-slate-500 cursor-not-allowed"
                              : "text-slate-50 bg-slate-800 border-slate-800 hover:bg-slate-700 hover:border-slate-700 hover:cursor-pointer"
                          }`}
                        >
                          Suivant {">"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 text-sm border rounded transition-colors ${
                            currentPage === totalPages
                              ? "text-slate-200 bg-slate-500 border-slate-500 cursor-not-allowed"
                              : "text-slate-50 bg-slate-800 border-slate-800 hover:bg-slate-700 hover:border-slate-700 hover:cursor-pointer"
                          }`}
                        >
                          Dernier
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {/* <footer id='pdf-footer' className="print-only mt-3 text-sm print:fixed print:bottom-8 print:w-full print:text-center print:bg-red-500">
                <p className='text-center' >Résidence <strong className='uppercase' >la félicité</strong>, bis au Lot VB 72 ZX Ambatoroaka.</p>
              </footer> */}
            </div>
          </main>
        </div>
      </div>
      {accountModal.isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 no-print">
          <div className="w-full max-w-md overflow-hidden bg-white shadow-xl border border-slate-200 rounded">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50">
              <div className=" pb-4 flex items-center gap-3 ">
                <div className="bg-slate-900 flex items-center justify-center p-3 rounded-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path className="fill-slate-50" d="M12 2C9.10051 2 6.75 4.3505 6.75 7.25V9.125H5.5C4.25736 9.125 3.25 10.1324 3.25 11.375V17.2495C3.25 19.8729 5.37665 21.9995 8 21.9995H16C18.6234 21.9995 20.75 19.8729 20.75 17.2495V11.375C20.75 10.1324 19.7426 9.125 18.5 9.125H17.25V7.25C17.25 4.35051 14.8995 2 12 2ZM12 3.5C14.0711 3.5 15.75 5.17893 15.75 7.25V9.125H8.25V7.25C8.25 5.17893 9.92893 3.5 12 3.5ZM12 14.5C12.8284 14.5 13.5 15.1716 13.5 16V17.5C13.5 18.3284 12.8284 19 12 19C11.1716 19 10.5 18.3284 10.5 17.5V16C10.5 15.1716 11.1716 14.5 12 14.5Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Paramètre du compte
                  </h3>
                  <p className="text-sm">Modifier votre mot de passe administrateur.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full text-slate-50 bg-slate-800 hover:bg-slate-900 transition-all hover:cursor-pointer text-sm w-6 h-6 ms-auto inline-flex justify-center items-center"
                  onClick={closeAccountModal}
                  disabled={isUpdatingPassword}
                >
                  <svg
                    className="w-2 h-2"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                  <span className="sr-only">Fermer</span>
                </button>
              </div>
            </div>
            <form
              onSubmit={handlePasswordUpdate}
              autoComplete="off"
              className="p-5 space-y-4 bg-white"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="admin_current_password"
                    autoComplete="new-password"
                    value={accountModal.currentPassword}
                    onChange={(event) =>
                      handlePasswordFieldChange("currentPassword", event.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-slate-500"
                    placeholder="Saisir le mot de passe actuel"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700 hover:cursor-pointer"
                    aria-label={
                      showCurrentPassword
                        ? "Masquer le mot de passe actuel"
                        : "Afficher le mot de passe actuel"
                    }
                  >
                    {showCurrentPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 3L21 21M10.58 10.58A2 2 0 0013.41 13.41M9.88 5.09A9.77 9.77 0 0112 4.86C16.5 4.86 20 8.38 21 12c-.35 1.26-1 2.55-1.94 3.69M6.5 6.5C4.66 7.8 3.39 9.71 3 12c1 3.62 4.5 7.14 9 7.14 1.56 0 2.99-.42 4.25-1.14"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 12C2.73 7.61 6.45 4.86 12 4.86C17.55 4.86 21.27 7.61 23 12C21.27 16.39 17.55 19.14 12 19.14C6.45 19.14 2.73 16.39 1 12Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                </div>
                {accountModal.errors.currentPassword && (
                  <p className="mt-1 text-xs text-rose-600">
                    {accountModal.errors.currentPassword}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="admin_new_password"
                    autoComplete="new-password"
                    value={accountModal.newPassword}
                    onChange={(event) =>
                      handlePasswordFieldChange("newPassword", event.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-slate-500"
                    placeholder="Saisir le nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700 hover:cursor-pointer"
                    aria-label={
                      showNewPassword
                        ? "Masquer le nouveau mot de passe"
                        : "Afficher le nouveau mot de passe"
                    }
                  >
                    {showNewPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 3L21 21M10.58 10.58A2 2 0 0013.41 13.41M9.88 5.09A9.77 9.77 0 0112 4.86C16.5 4.86 20 8.38 21 12c-.35 1.26-1 2.55-1.94 3.69M6.5 6.5C4.66 7.8 3.39 9.71 3 12c1 3.62 4.5 7.14 9 7.14 1.56 0 2.99-.42 4.25-1.14"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 12C2.73 7.61 6.45 4.86 12 4.86C17.55 4.86 21.27 7.61 23 12C21.27 16.39 17.55 19.14 12 19.14C6.45 19.14 2.73 16.39 1 12Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                </div>
                {accountModal.errors.newPassword && (
                  <p className="mt-1 text-xs text-rose-600">{accountModal.errors.newPassword}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 bg-slate-50 px-5 py-4 -mx-5 -mb-5 mt-6">
                <button
                  type="button"
                  onClick={closeAccountModal}
                  disabled={isUpdatingPassword}
                  className={`px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 ${
                    isUpdatingPassword
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-slate-100 hover:cursor-pointer"
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded ${
                    isUpdatingPassword
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 hover:cursor-pointer"
                  }`}
                >
                  {isUpdatingPassword ? "Mise à jour..." : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 no-print">
          <div className="w-full max-w-md overflow-hidden bg-white shadow-xl border border-slate-200 rounded">
            <div className="border-b border-slate-200 px-5 py-4">
              <div class="border-b border-slate-200 pb-4 flex items-center gap-3 bg-slate-50">
                <div class="bg-rose-500 flex items-center justify-center p-3 rounded-xl ">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      className="fill-slate-50"
                      d="M14.7223 12.7585C14.7426 12.3448 14.4237 11.9929 14.01 11.9726C13.5963 11.9522 13.2444 12.2711 13.2241 12.6848L12.9999 17.2415C12.9796 17.6552 13.2985 18.0071 13.7122 18.0274C14.1259 18.0478 14.4778 17.7289 14.4981 17.3152L14.7223 12.7585Z"
                    />
                    <path
                      className="fill-slate-50"
                      d="M9.98802 11.9726C9.5743 11.9929 9.25542 12.3448 9.27577 12.7585L9.49993 17.3152C9.52028 17.7289 9.87216 18.0478 10.2859 18.0274C10.6996 18.0071 11.0185 17.6552 10.9981 17.2415L10.774 12.6848C10.7536 12.2711 10.4017 11.9522 9.98802 11.9726Z"
                    />
                    <path
                      className="fill-slate-50"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M10.249 2C9.00638 2 7.99902 3.00736 7.99902 4.25V5H5.5C4.25736 5 3.25 6.00736 3.25 7.25C3.25 8.28958 3.95503 9.16449 4.91303 9.42267L5.54076 19.8848C5.61205 21.0729 6.59642 22 7.78672 22H16.2113C17.4016 22 18.386 21.0729 18.4573 19.8848L19.085 9.42267C20.043 9.16449 20.748 8.28958 20.748 7.25C20.748 6.00736 19.7407 5 18.498 5H15.999V4.25C15.999 3.00736 14.9917 2 13.749 2H10.249ZM14.499 5V4.25C14.499 3.83579 14.1632 3.5 13.749 3.5H10.249C9.83481 3.5 9.49902 3.83579 9.49902 4.25V5H14.499ZM5.5 6.5C5.08579 6.5 4.75 6.83579 4.75 7.25C4.75 7.66421 5.08579 8 5.5 8H18.498C18.9123 8 19.248 7.66421 19.248 7.25C19.248 6.83579 18.9123 6.5 18.498 6.5H5.5ZM6.42037 9.5H17.5777L16.96 19.7949C16.9362 20.191 16.6081 20.5 16.2113 20.5H7.78672C7.38995 20.5 7.06183 20.191 7.03807 19.7949L6.42037 9.5Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-slate-900 ">
                    Confirmer la suppression
                  </h3>
                  <p class=" text-sm ">Cette action est irréversible.</p>
                </div>
                <button
                  type="button"
                  class="rounded-full text-slate-50 bg-slate-800 hover:bg-slate-900 transition-all hover:cursor-pointer  text-sm w-6 h-6 ms-auto inline-flex justify-center items-center  dark:hover:text-white"
                  onClick={closeDeleteModal}
                >
                  <svg
                    class="w-2 h-2"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                  <span class="sr-only">Close modal</span>
                </button>
              </div>
              <p className=" p-4 md:p-5 space-y-4 mt-2 text-sm text-slate-600">
                {deleteModal.mode === "bulk" ? (
                  <>
                    Voulez-vous vraiment supprimer ces{" "}
                    <span className="font-semibold text-slate-900">
                      {deleteModal.transactionIds.length}
                    </span>{" "}
                    éléments ?
                  </>
                ) : (
                  <>
                    Voulez-vous vraiment supprimer l&apos;opération
                    {deleteModal.transactionLabel ? (
                      <span className="font-semibold text-slate-900">
                        {" "}
                        {'"' + deleteModal.transactionLabel + '"'}
                      </span>
                    ) : (
                      ""
                    )}{" "}
                    ?
                  </>
                )}
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
                className={`px-4 py-2 text-sm font-semibold text-white rounded ${
                  isDeleting
                    ? "bg-rose-300 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-700 hover:cursor-pointer"
                }`}
              >
                {deleteModal.mode === "bulk"
                  ? `Supprimer (${deleteModal.transactionIds.length})`
                  : "Supprimer"}
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

      <footer class="bg-neutral-primary-soft rounded-base shadow-xs border border-default  bg-slate-900">
        <div class="w-full mx-auto max-w-7xl p-4 md:flex md:items-center md:justify-between">
          <span class="text-slate-50 text-sm text-body sm:text-center">
            © {new Date().getFullYear()}{" "}
            <a href="https://flowbite.com/" class="hover:underline">
              Raoelison-Compte
            </a>
            . Tous droits réservés.
          </span>
          <ul class="flex flex-wrap items-center mt-3 text-sm font-medium text-body sm:mt-0">
            <li>
              <a
                target="blank"
                href="https://www.linkedin.com/in/ralf-lionel-066b20227/"
                class="text-slate-50 hover:underline"
              >
                Contactez-le développeur
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export default App;


