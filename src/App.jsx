import React, { useState, useEffect } from 'react';
import { useTransactionManager } from './hooks/useTransactionManager';
import exportPDF from './core/finance';

function App() {
  const initialTransactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const { transactions, setFilterLibelle, addTransaction, dateFilter, setDateFilter, toggleSortOrder, deleteTransaction } =
    useTransactionManager(initialTransactions);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    libelle: '',
    recette: '',
    depense: '',
  });

  const [printDetails, setPrintDetails] = useState({
    libelle: '',
    dateFrom: '',
    dateTo: '',
  });

  const [errors, setErrors] = useState({});
  const [exportErrors, setExportErrors] = useState({});
  const [searchLibelle, setSearchLibelle] = useState('');

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions.items));
  }, [transactions.items]);

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

    // S'il y a des erreurs, on les affiche et on arrête tout
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

    setFormData({ ...formData, libelle: '', recette: '', depense: '' });
    setErrors({});
  };

  const handleDateModeChange = (mode) => {
    setDateFilter((prev) => ({ ...prev, mode }));
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilter((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecetteChange = (value) => {
    setFormData({ ...formData, recette: value, depense: '' });
  };

  const handleDepenseChange = (value) => {
    setFormData({ ...formData, depense: value, recette: '' });
  };

  const handleExportPDF = () => {
    let newErrors = {};

    if (!printDetails.libelle.trim() || !printDetails.dateFrom || !printDetails.dateTo) {
      newErrors.general = "Veuillez remplir le libellé, la date de début et la date de fin avant l'exportation.";
    }

    if (printDetails.dateFrom && printDetails.dateTo && printDetails.dateFrom > printDetails.dateTo) {
      newErrors.general = "La date de début doit être antérieure ou égale à la date de fin.";
    }

    if (Object.keys(newErrors).length > 0) {
      setExportErrors(newErrors);
      return;
    }

    setExportErrors({});
    exportPDF(transactions.items, printDetails.libelle, printDetails.dateFrom, printDetails.dateTo);
  };

  const handleSearchChange = (value) => {
    setSearchLibelle(value);
    setFilterLibelle(value);
  };

  const clearSearch = () => {
    setSearchLibelle('');
    setFilterLibelle('');
  };

  const hasActiveFilters =
    searchLibelle.trim() !== '' ||
    dateFilter.mode !== 'all' ||
    !!dateFilter.from ||
    !!dateFilter.to;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-350 mx-auto">
        <header className="grid grid-cols-1 md:grid-cols-4 mb-6 gap-6 md:gap-10 items-end no-print">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Live Compte</h1>
            <p className="text-slate-500">Gestion de tresorerie en temps reel</p>
          </div>

          <div className="col-span-1 md:col-span-3 max-w-full grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Filtrer par libelle</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchLibelle}
                  className="w-full px-3 py-2 pr-8 bg-white border border-slate-200 outline-none"
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchLibelle && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-2 text-slate-500 hover:text-slate-800 hover:cursor-pointer"
                    aria-label="Effacer la recherche"
                  >
                    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12.3906C2 6.86778 6.47715 2.39062 12 2.39062C17.5228 2.39062 22 6.86778 22 12.3906C22 17.9135 17.5228 22.3906 12 22.3906C6.47715 22.3906 2 17.9135 2 12.3906ZM8.78362 10.2354L10.9388 12.3906L8.78362 14.5458C8.49073 14.8387 8.49073 15.3136 8.78362 15.6065C9.07652 15.8994 9.55139 15.8994 9.84428 15.6065L11.9995 13.4513L14.1546 15.6064C14.4475 15.8993 14.9224 15.8993 15.2153 15.6064C15.5082 15.3135 15.5082 14.8387 15.2153 14.5458L13.0602 12.3906L15.2153 10.2355C15.5082 9.94258 15.5082 9.46771 15.2153 9.17482C14.9224 8.88192 14.4475 8.88192 14.1546 9.17482L11.9995 11.33L9.84428 9.17475C9.55139 8.88186 9.07652 8.88186 8.78362 9.17475C8.49073 9.46764 8.49073 9.94251 8.78362 10.2354Z" fill="#323544"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Type date</label>
              <select
                value={dateFilter.mode}
                onChange={(e) => handleDateModeChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
              >
                <option value="all">Toutes</option>
                <option value="range">Entre 2 dates</option>
              </select>
            </div>

            <button
              onClick={handleExportPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 font-medium transition-all shadow-lg active:scale-95 md:col-span-1"
            >
              Exporter PDF
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1 no-print">
            <div className="bg-white p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-6 border-b pb-2">Nouvelle Operation</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Libelle</label>
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
                    onChange={(e) => 
                    {
                      setFormData({ ...formData, libelle: e.target.value });
                      if(errors.libelle) setErrors({...errors, libelle: null});
                    }
                  }
                    className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-emerald-600 mb-1">Recette (Ar)</label>
                    
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.recette}
                      onChange={(e) => handleRecetteChange(e.target.value)}
                      disabled={!!formData.depense}
                      className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-rose-600 mb-1">Depense (Ar)</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.depense}
                      onChange={(e) => handleDepenseChange(e.target.value)}
                      disabled={!!formData.recette}
                      className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div className="col-span-2">
                    {errors.montant && (
                        <span className="text-rose-500 text-[10px] font-bold block mb-1">{errors.montant}</span>
                      )}
                    </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-3 font-bold hover:bg-slate-800 transition-colors mt-4"
                >
                  Ajouter a la liste
                </button>
              </form>
            </div>
          </aside>

          <main className="lg:col-span-3 overflow-x-auto">
            <div className='grid grid-cols-2 gap-3 mb-3' >
              {dateFilter.mode === 'range' && (
                <>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Date debut</label>
                    <input
                      type="date"
                      value={dateFilter.from}
                      onChange={(e) => handleDateFilterChange('from', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Date fin</label>
                    <input
                      type="date"
                      value={dateFilter.to}
                      onChange={(e) => handleDateFilterChange('to', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="table-parent-container bg-white  overflow-hidden shadow-sm py-3">
              <div className="print-only flex justify-center">
                <h2 className="text-center text-lg mb-4">
                  Résidence <strong className='uppercase' >la félicité</strong> Ambatoroaka. 
                  <br />
                  <div className='my-3'>
                    Facture du 
                    <input
                      type="text"
                      placeholder="Libellé"
                      value={printDetails.libelle}
                      onChange={(e) => {
                        setPrintDetails({ ...printDetails, libelle: e.target.value });
                        if (exportErrors.general) setExportErrors({});
                      }}
                      className="inline-block border-b border-gray-400 outline-none text-center w-40 font-bold"
                    />
                    de
                    <input
                      type="date"
                      value={printDetails.dateFrom}
                      onChange={(e) => {
                        setPrintDetails({ ...printDetails, dateFrom: e.target.value });
                        if (exportErrors.general) setExportErrors({});
                      }}
                      className="mx-2 inline-block border-b border-gray-400 outline-none text-center w-40 font-bold"
                    />
                    au 
                    <input
                      type="date"
                      value={printDetails.dateTo}
                      onChange={(e) => {
                        setPrintDetails({ ...printDetails, dateTo: e.target.value });
                        if (exportErrors.general) setExportErrors({});
                      }}
                      className=" mx-2 inline-block border-b border-gray-400 outline-none text-center w-40 font-bold"
                    />
                    {exportErrors.general && (
                      <p className="text-rose-500 text-[11px] font-bold mt-2">{exportErrors.general}</p>
                    )}
                  </div>
                  
                </h2>
              </div>
              
              <div className="relative max-h-[90vh] overflow-y-auto border border-slate-200 ">
                <table className="w-full text-left border-collapse print:mt-6 print:pt-6">
                  <thead className=''  >
                    <tr className="  border-b border-slate-200  ">
                      <th className=" sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider" onClick={toggleSortOrder} style={{ cursor: 'pointer' }}>
                        Date
                      </th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider">Libelle</th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Recettes</th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Depenses</th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Solde</th>
                      <th className="sticky top-0 bg-slate-900 px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-500">
                          {hasActiveFilters
                            ? 'Aucun résultat trouvé pour les filtres actuels.'
                            : "Aucune donnée pour le moment. Veuillez insérer une opération."}
                        </td>
                      </tr>
                    ) : (
                      transactions.items.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap text-sm">
                            {new Date(t.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 text-sm italic">{t.libelle.toUpperCase()}</td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-bold text-sm">
                            {t.recette > 0 ? `${t.recette.toLocaleString()} Ar` : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-rose-600 font-bold text-sm">
                            {t.depense > 0 ? `${t.depense.toLocaleString()} Ar` : '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30 text-sm">
                            {t.solde.toLocaleString()} Ar
                          </td>
                          <td className='px-2' > <button className='bg-red-500 hover:bg-red-600 hover:cursor-pointer text-center w-full uppercase py-2 text-gray-50' key={t.id} onClick={()=>deleteTransaction(t.id)} >supprimer</button> </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan="2" className="px-6 py-5 text-sm bold">
                        TOTAL GENERAL
                      </td>
                      <td className="px-6 py-5 text-right text-emerald-400 bold">
                        {transactions.totalRecettes.toLocaleString()} Ar
                      </td>
                      <td className="px-6 py-5 text-right text-rose-400 bold">
                        {transactions.totalDepenses.toLocaleString()} Ar
                      </td>
                      <td className="px-6 py-5 text-right bold">{transactions.soldeFinal.toLocaleString()} Ar</td>
                      <td className="px-6 py-5 text-right bold"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <footer id='pdf-footer' className="print-only mt-3 text-sm print:fixed print:bottom-8 print:w-full print:text-center print:bg-red-500">
                <p className='text-center' >Résidence <strong>LA FELICITE</strong>, bis au Lot VB 72 ZX Ambatoroaka.</p>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
