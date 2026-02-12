import React from 'react';
import { useTransactionManager } from './hooks/useTransactionManager';

function App() {
  const { transactions, setFilterLibelle } = useTransactionManager([
    { id: 1, date: "2026-01-02", libelle: "LOYER", recette: 1000, depense: 0 },
    { id: 2, date: "2026-01-10", libelle: "ENTRETIEN", recette: 0, depense: 500 },
    { id: 3, date: "2026-01-11", libelle: "LOYER", recette: 4000, depense: 0 },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* Header - Masqué à l'impression */}
        <header className=" flex flex-col justify-between items-center mb-10 gap-4 no-print">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Live Compte
            </h1>
            <p className="text-slate-500">Gestion de trésorerie en temps réel</p>
          </div>

          <div className="flex items-center gap-4">
            <input 
              type="text"
              placeholder="Rechercher un libellé..."
              className="px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-64"
              onChange={(e) => setFilterLibelle(e.target.value)}
            />
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 font-medium transition-colors shadow-sm"
            >
              Exporter PDF
            </button>
          </div>
        </header>

        {/* Tableau Style "Clean Architecture" */}
        <div className="bg-white  border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-50 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-50 uppercase tracking-wider">Libellé</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-50 uppercase tracking-wider text-right">Recettes</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-50 uppercase tracking-wider text-right">Dépenses</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-50 uppercase tracking-wider text-right">Solde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {t.libelle}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                    {t.recette > 0 ? `${t.recette.toLocaleString()} Ar` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-rose-600 font-medium">
                    {t.depense > 0 ? `${t.depense.toLocaleString()} Ar` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 bg-slate-50/30">
                    {t.solde.toLocaleString()} Ar
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Pied de tableau pour le total final */}
            <tfoot>
               <tr className="bg-slate-900 text-white font-bold border">
                 <td colSpan="2" className="px-6 py-4">TOTAL</td>
                 <td className="px-6 py-4 text-right">
                 {transactions.totalRecettes.toLocaleString()} Ar
                 </td>
                 <td className="px-6 py-4 text-right">
                 {transactions.totalDepenses.toLocaleString()} Ar
                 </td>
                 <td className="px-6 py-4 text-right">
                 {transactions.soldeFinal.toLocaleString()} Ar
                 </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;