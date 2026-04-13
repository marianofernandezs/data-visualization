import { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { DataPreview } from './components/DataPreview';
import { Dashboard } from './components/Dashboard';
import { parseCSV, profileData, generateCorrelationMatrix, generateQualityReport, type DatasetMeta, type ColumnProfile, type Warning, type DataQualityReport } from './tools/DataEngine';
import { Loader2 } from 'lucide-react';

type AppState = 'upload' | 'processing' | 'preview' | 'dashboard';

function App() {
  const [state, setState] = useState<AppState>('upload');
  
  // Data State
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [globalWarnings, setGlobalWarnings] = useState<Warning[]>([]);
  
  // Analyzed State
  const [profiles, setProfiles] = useState<ColumnProfile[]>([]);
  const [correlationMatrix, setCorrelationMatrix] = useState<Record<string, Record<string, number>>>({});
  const [qualityReport, setQualityReport] = useState<DataQualityReport | undefined>(undefined);

  const handleFileSelect = async (file: File) => {
    setState('processing');
    try {
      const { data: parsedData, meta: parsedMeta, warnings } = await parseCSV(file);
      setData(parsedData);
      setMeta(parsedMeta);
      setGlobalWarnings(warnings);
      setState('preview');
    } catch (err) {
      alert("Error procesando CSV");
      setState('upload');
    }
  };

  const handleAnalyze = async (selectedColumns: string[]) => {
    if (!meta) return;
    setState('processing');
    setTimeout(() => {
      const { profiles: newProfiles, warnings: profileWarnings } = profileData(data, selectedColumns, globalWarnings);
      const matrix = generateCorrelationMatrix(data, newProfiles, profileWarnings);
      const dqr = generateQualityReport(meta, newProfiles, profileWarnings);

      setProfiles(newProfiles);
      setGlobalWarnings(profileWarnings);
      setCorrelationMatrix(matrix);
      setQualityReport(dqr);
      setState('dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold font-heading text-lg leading-none">I</span>
            </div>
            <h1 className="text-xl font-heading font-bold text-gray-900 tracking-tight">InsightBoard</h1>
          </div>
          {state === 'dashboard' && (
            <button 
              onClick={() => window.print()}
              className="text-sm font-medium text-accent hover:text-accent/80 px-4 py-2 bg-secondary rounded-md"
            >
              Exportar a PDF
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {state === 'upload' && (
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-heading font-extrabold text-gray-900 mb-4 tracking-tight">Analítica Visual <span className="text-primary">Instantánea</span></h2>
              <p className="text-textPrimary max-w-2xl mx-auto text-lg">
                Sube tu archivo CSV y generaremos un dashboard iterativo en tu navegador. <br/>Tus datos no salen de tu computadora.
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {state === 'processing' && (
          <div className="flex flex-col items-center justify-center mt-32 animate-pulse">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-heading font-medium text-gray-800">Procesando conjunto de datos...</h3>
            <p className="text-gray-500 text-sm mt-2">Calculando outliers, IQR matrices en entorno seguro.</p>
          </div>
        )}

        {state === 'preview' && meta && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="mb-6">
                <button onClick={() => setState('upload')} className="text-sm text-gray-500 hover:text-primary transition-colors">
                  ← Volver a subir
                </button>
             </div>
             <DataPreview data={data} meta={meta} onAnalyze={handleAnalyze} />
           </div>
        )}

        {state === 'dashboard' && (
          <div className="animate-in fade-in duration-700">
             <div className="mb-6 flex items-center justify-between">
                <div>
                  <button onClick={() => setState('preview')} className="text-sm text-gray-500 hover:text-primary transition-colors">
                    ← Refinar Columnas
                  </button>
                  <h2 className="text-3xl font-heading font-bold text-gray-900 mt-2">Reporte de Análisis</h2>
                  <p className="text-gray-500">Basado en {meta?.filename}</p>
                </div>
             </div>
             <Dashboard data={data} profiles={profiles} warnings={globalWarnings} qualityReport={qualityReport} correlationMatrix={correlationMatrix} />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
