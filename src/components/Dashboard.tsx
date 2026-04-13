import { useState } from 'react';
import { type ColumnProfile, type Warning, type DataQualityReport } from '../tools/DataEngine';
import { AlertCircle, BarChart3, Binary, Hash, Type, ShieldAlert, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  profiles: ColumnProfile[];
  warnings: Warning[];
  qualityReport?: DataQualityReport;
  correlationMatrix: Record<string, Record<string, number>>;
  data: any[];
}

const SvgBoxPlot = ({ stats }: { stats: any, name: string }) => {
  if (!stats || typeof stats.q1 !== 'number') return <p className="text-gray-400 italic text-sm mt-3">Sin suficientes datos IQR</p>;

  const visualMin = Math.min(stats.min, stats.lowerBound);
  const visualMax = Math.max(stats.max, stats.upperBound);
  const range = (visualMax - visualMin) || 1;

  const toPercent = (val: number) => ((val - visualMin) / range) * 100;

  const pLower = toPercent(stats.lowerBound);
  const pQ1 = toPercent(stats.q1);
  const pMed = toPercent(stats.median);
  const pQ3 = toPercent(stats.q3);
  const pUpper = toPercent(stats.upperBound);

  return (
    <div className="w-full mt-6 mb-2 flex flex-col p-4 bg-gray-50/50 rounded-lg border border-gray-100">
      <div className="text-sm text-textPrimary font-semibold mb-5 flex items-center justify-between">
        <span>Outliers: {stats.outlierCount}</span>
        <span className="text-gray-400 font-normal">IQR Distribución</span>
      </div>
      <div className="relative h-10 w-full mb-1">
        {/* Limits */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-300" style={{ transform: 'translateY(-50%)', left: `${Math.max(0, pLower)}%`, right: `${100 - Math.min(100, pUpper)}%` }}></div>

        {/* Whiskers */}
        <div className="absolute top-1/2 w-[2px] h-[14px] bg-gray-400" style={{ transform: 'translate(-50%, -50%)', left: `${Math.max(0, pLower)}%` }}></div>
        <div className="absolute top-1/2 w-[2px] h-[14px] bg-gray-400" style={{ transform: 'translate(-50%, -50%)', left: `${Math.min(100, pUpper)}%` }}></div>

        {/* IQR Box */}
        <div className="absolute top-1/2 h-[20px] bg-primary/20 border border-primary/50 shadow-sm rounded-sm" style={{ transform: 'translateY(-50%)', left: `${pQ1}%`, width: `${pQ3 - pQ1}%` }}></div>

        {/* Median Marker */}
        <div className="absolute top-1/2 w-1 h-[24px] bg-primary rounded-full shadow-md" style={{ transform: 'translate(-50%, -50%)', left: `${pMed}%` }}></div>

        {/* Outliers */}
        {stats.outliers && stats.outliers.slice(0, 50).map((outlier: number, idx: number) => {
          const pOut = toPercent(outlier);
          if (pOut < 0 || pOut > 100) return null; // Overflow safeguard
          return <div key={idx} className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-error border border-white" style={{ transform: 'translate(-50%, -50%)', left: `${pOut}%` }} title={outlier.toString()}></div>
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-medium">
        <span>Min: {stats.min.toFixed(1)}</span>
        <span>Q1: {stats.q1.toFixed(1)}</span>
        <span>Med: {stats.median.toFixed(1)}</span>
        <span>Q3: {stats.q3.toFixed(1)}</span>
        <span>Max: {stats.max.toFixed(1)}</span>
      </div>
    </div>
  );
};

export function Dashboard({ profiles, qualityReport, correlationMatrix, data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'quality' | 'overview' | 'correlations'>('quality');

  const typeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-5 h-5 text-accent" />;
      case 'text': return <Type className="w-5 h-5 text-chart-4" />;
      case 'boolean': return <Binary className="w-5 h-5 text-chart-5" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getChartData = (col: string) => {
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const val = String(row[col] ?? 'null');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-8 animate-in fade-in duration-500">

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('quality')}
          className={`py-3 px-6 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'quality' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Data Quality Report
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-6 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Exploración de Variables
        </button>
        <button
          onClick={() => setActiveTab('correlations')}
          className={`py-3 px-6 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'correlations' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Análisis de Correlación
        </button>
      </div>

      {/* Quality Report Tab Content */}
      {activeTab === 'quality' && qualityReport && (
        <div className="space-y-6">
          {/* Auto Generated Summary */}
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-BRAND border border-primary/20">
            <h3 className="text-xl font-heading font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-primary" /> Resumen Automático (IA)
            </h3>
            <p className="text-gray-700 leading-relaxed font-medium">
              {qualityReport.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-BRAND shadow-sm border border-gray-100 flex flex-col justify-center items-center">
              <h4 className="text-md font-bold text-gray-800 mb-4">Calidad Global</h4>
              <div className={`w-32 h-32 rounded-full flex items-center justify-center border-[12px] bg-white ${qualityReport.qualityScore > 80 ? 'border-emerald-500 text-emerald-500' : qualityReport.qualityScore > 60 ? 'border-amber-500 text-amber-500' : 'border-red-500 text-red-500'}`}>
                <span className="text-4xl font-heading font-extrabold">{qualityReport.qualityScore}</span>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center px-4">Basado en completitud, seguridad PII y consistencia.</p>
            </div>

            <div className="bg-white p-6 rounded-BRAND shadow-sm border border-gray-100">
              <h4 className="text-md font-bold text-gray-800 flex items-center gap-2 mb-4">
                <ShieldAlert className={`w-5 h-5 ${qualityReport.piiWarnings.length > 0 ? 'text-error' : 'text-success'}`} />
                Escaneo de Datos Sensibles (PII)
              </h4>
              {qualityReport.piiWarnings.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Recomendamos omitir estas columnas previo a modelamientos externos:</p>
                  {qualityReport.piiWarnings.map((w, i) => (
                    <div key={i} className="flex justify-between items-center bg-red-50 p-3 rounded-md border border-red-100">
                      <span className="font-semibold text-error">{w.column}</span>
                      <span className="text-xs font-medium text-error uppercase tracking-wider px-2 py-1 bg-red-100 rounded-full">Email / Teléfono</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-50 p-4 rounded-md border border-green-100 text-green-700 text-sm font-medium">
                  No se detectaron secuencias que comprometan la privacidad personal (PII) en la selección actual.
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-BRAND shadow-sm border border-gray-100">
              <h4 className="text-md font-bold text-gray-800 flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-warning" /> Estado de Valores Nulos
              </h4>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-heading font-extrabold text-gray-900">{qualityReport.totalMissing}</span>
                <span className="text-sm text-gray-500 mb-1">Celdas vacías en total.</span>
              </div>

              {qualityReport.highNullWarnings.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600 mb-3">Columnas severamente críticas (&gt;80% vacías):</p>
                  {qualityReport.highNullWarnings.map((w, i) => (
                    <div key={i} className="text-sm font-medium text-warning bg-orange-50 px-3 py-2 rounded-md border border-orange-100 mb-2">
                      {w.column}: {w.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {profiles.map((p, idx) => (
            <div key={idx} className="bg-white p-8 rounded-BRAND shadow-sm border border-gray-100 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-md">
                    {typeIcon(p.detectedType)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 truncate" title={p.name}>{p.name}</h3>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium uppercase tracking-wider">
                  {p.detectedType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Valores Nulos</p>
                  <p className="text-lg font-bold text-gray-800">{p.nullCount} <span className="text-sm text-gray-400 font-normal">({p.nullPercent.toFixed(1)}%)</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Valores Únicos</p>
                  <p className="text-lg font-bold text-gray-800">{p.uniqueCount}</p>
                </div>
              </div>

              {p.detectedType === 'numeric' && p.stats && (
                <SvgBoxPlot stats={p.stats} name={p.name} />
              )}

              <div className="mt-6 pt-6 flex-grow min-h-[300px] w-full border-t border-gray-100 pb-2">
                <p className="text-sm text-gray-500 font-medium mb-4">Distribución de Frecuencia (Top 10)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData(p.name)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {
                        getChartData(p.name).map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={`var(--chart-${(index % 8) + 1})`} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Correlations Tab Content */}
      {activeTab === 'correlations' && (
        <div className="bg-white p-8 rounded-BRAND shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Matriz de Correlación (Pearson)</h3>
          {Object.keys(correlationMatrix).length === 0 ? (
            <p className="text-gray-500 italic">No hay suficientes datos o métricas puras para correlacionar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead>
                  <tr>
                    <th className="p-3"></th>
                    {Object.keys(correlationMatrix).map(col => (
                      <th key={col} className="p-3 font-semibold text-gray-700 writing-mode-vertical truncate max-w-[100px]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(correlationMatrix).map(rowCol => (
                    <tr key={rowCol}>
                      <td className="p-3 font-semibold text-gray-700 text-left truncate max-w-[120px]">{rowCol}</td>
                      {Object.keys(correlationMatrix).map(col => {
                        const val = correlationMatrix[rowCol][col];
                        const absVal = Math.abs(val);
                        const bgOpacity = Math.max(0.1, absVal).toFixed(2);
                        const bgColor = val > 0 ? `rgba(123, 104, 238, ${bgOpacity})` : `rgba(239, 68, 68, ${bgOpacity})`;
                        return (
                          <td key={col} className="p-3" style={{ backgroundColor: col !== rowCol ? bgColor : 'transparent' }}>
                            <span className={Math.abs(val) > 0.5 ? 'font-bold text-white' : 'text-gray-800'}>
                              {col !== rowCol ? val.toFixed(2) : '-'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
