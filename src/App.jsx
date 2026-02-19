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

  const handleRecetteChange = (value) => {
    setFormData({ ...formData, recette: value, depense: '' });
  };

  const handleDepenseChange = (value) => {
    setFormData({ ...formData, depense: value, recette: '' });
  };

  const handleExportPDF = () => {
    exportPDF(transactions.items, printDetails.libelle, printDetails.dateFrom, printDetails.dateTo);
  };

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
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                onChange={(e) => setFilterLibelle(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Type date</label>
              <select
                value={dateFilter.mode}
                onChange={(e) => handleDateModeChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
              >
                <option value="all">Toutes</option>
                <option value="month">Par mois</option>
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
                      onChange={(e) => setPrintDetails({ ...printDetails, libelle: e.target.value })}
                      className="inline-block border-b border-gray-400 outline-none text-center w-40"
                    />
                    de
                    <input
                      type="date"
                      value={printDetails.dateFrom}
                      onChange={(e) => setPrintDetails({ ...printDetails, dateFrom: e.target.value })}
                      className="mx-2 inline-block border-b border-gray-400 outline-none text-center w-40"
                    />
                    au 
                    <input
                      type="date"
                      value={printDetails.dateTo}
                      onChange={(e) => setPrintDetails({ ...printDetails, dateTo: e.target.value })}
                      className=" mx-2 inline-block border-b border-gray-400 outline-none text-center w-40"
                    />
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
                    {transactions.items.map((t) => (
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
                    ))}
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
