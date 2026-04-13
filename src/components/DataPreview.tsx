import { useState } from 'react';
import { type DatasetMeta } from '../tools/DataEngine';
import { CheckSquare, Square, Play } from 'lucide-react';

interface DataPreviewProps {
  data: any[];
  meta: DatasetMeta;
  onAnalyze: (selectedColumns: string[]) => void;
}

export function DataPreview({ data, meta, onAnalyze }: DataPreviewProps) {
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(meta.columns));
  
  const previewData = data.slice(0, 10);

  const toggleColumn = (col: string) => {
    const next = new Set(selectedCols);
    if (next.has(col)) {
      next.delete(col);
    } else {
      next.add(col);
    }
    setSelectedCols(next);
  };

  const handleSelectAll = (select: boolean) => {
    if (select) setSelectedCols(new Set(meta.columns));
    else setSelectedCols(new Set());
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-BRAND shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-gray-900">{meta.filename}</h2>
          <p className="text-sm text-textPrimary mt-1">
            {meta.rowCount} filas × {meta.columnCount} columnas
          </p>
        </div>
        <button
          onClick={() => onAnalyze(Array.from(selectedCols))}
          disabled={selectedCols.size === 0}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors shadow-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          Correr Análisis ({selectedCols.size})
        </button>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="mb-4 flex items-center gap-4 text-sm">
          <span className="font-semibold text-gray-700">Seleccionar:</span>
          <button onClick={() => handleSelectAll(true)} className="text-accent hover:underline">Todas</button>
          <span className="text-gray-300">|</span>
          <button onClick={() => handleSelectAll(false)} className="text-accent hover:underline">Ninguna</button>
        </div>

        <table className="w-full text-left text-sm text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-secondary/50 border-b-2 border-primary/20">
            <tr>
              {meta.columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleColumn(col)}>
                    {selectedCols.has(col) ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 group-hover:text-primary/70" />
                    )}
                    <span className={selectedCols.has(col) ? 'text-primary font-bold' : ''}>{col}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-gray-50 hover:bg-gray-50/50">
                {meta.columns.map((col, cIdx) => (
                  <td key={cIdx} className={`px-4 py-2 whitespace-nowrap ${!selectedCols.has(col) && 'opacity-30'}`}>
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-gray-300 italic">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {meta.rowCount > 10 && (
          <div className="mt-4 text-center text-sm text-gray-400 italic">
            Mostrando las primeras 10 de {meta.rowCount} filas...
          </div>
        )}
      </div>
    </div>
  );
}
