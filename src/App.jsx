import React, { useState } from 'react';
import { useTransactionManager } from './hooks/useTransactionManager';

function App() {
  const { transactions, setFilterLibelle, addTransaction, dateFilter, setDateFilter } =
    useTransactionManager([
      { id: 1, date: '2026-01-02', libelle: 'LOYER', recette: 1000, depense: 0 },
      { id: 2, date: '2026-01-10', libelle: 'ENTRETIEN', recette: 0, depense: 500 },
      { id: 3, date: '2026-01-11', libelle: 'LOYER', recette: 4000, depense: 0 },
    ]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    libelle: '',
    recette: '',
    depense: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.libelle) return;

    addTransaction({
      ...formData,
      recette: Number(formData.recette) || 0,
      depense: Number(formData.depense) || 0,
    });

    setFormData({ ...formData, libelle: '', recette: '', depense: '' });
  };

  const handleDateModeChange = (mode) => {
    setDateFilter((prev) => ({ ...prev, mode }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        <header className="grid grid-cols-1 md:grid-cols-4 mb-10 gap-6 md:gap-10 items-end no-print">
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
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 font-medium transition-all shadow-lg active:scale-95 md:col-span-1"
            >
              Exporter PDF
            </button>

            {dateFilter.mode === 'month' && (
              <div className="md:col-span-3">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Mois</label>
                <input
                  type="month"
                  value={dateFilter.month}
                  onChange={(e) =>
                    setDateFilter((prev) => ({
                      ...prev,
                      month: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                />
              </div>
            )}

            {dateFilter.mode === 'range' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Date debut</label>
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) =>
                      setDateFilter((prev) => ({
                        ...prev,
                        from: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Date fin</label>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) =>
                      setDateFilter((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 outline-none"
                  />
                </div>
              </>
            )}
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
                  <input
                    type="text"
                    placeholder="ex: Vente de marchandise..."
                    value={formData.libelle}
                    onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-emerald-600 mb-1">Recette</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.recette}
                      onChange={(e) => setFormData({ ...formData, recette: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-rose-600 mb-1">Depense</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.depense}
                      onChange={(e) => setFormData({ ...formData, depense: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-rose-500"
                    />
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
            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider">Libelle</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Recettes</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Depenses</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-50 uppercase tracking-wider text-right">Solde</th>
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
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td colSpan="2" className="px-6 py-5 text-sm">
                      TOTAL GENERAL
                    </td>
                    <td className="px-6 py-5 text-right text-emerald-400">
                      {transactions.totalRecettes.toLocaleString()} Ar
                    </td>
                    <td className="px-6 py-5 text-right text-rose-400">
                      {transactions.totalDepenses.toLocaleString()} Ar
                    </td>
                    <td className="px-6 py-5 text-right">{transactions.soldeFinal.toLocaleString()} Ar</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
