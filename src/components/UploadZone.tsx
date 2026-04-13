import React, { useCallback, useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndPassFile(file);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.csv')) {
      setError("Solo se permiten archivos CSV.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("El archivo excede el límite de 50MB.");
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div 
        className={`relative flex flex-col items-center justify-center p-12 overflow-hidden border-2 border-dashed rounded-BRAND transition-all duration-300 ease-in-out ${
          dragActive ? 'border-primary bg-secondary shadow-lg' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="absolute inset-0 w-full h-full pointer-events-none" />
        <UploadCloud className={`w-16 h-16 mb-4 transition-colors ${dragActive ? 'text-primary' : 'text-gray-400'}`} />
        <h3 className="text-xl font-heading font-semibold text-gray-800 mb-2">
          Arrastra tu CSV aquí
        </h3>
        <p className="text-sm text-textPrimary text-center mb-6">
          o haz clic para explorar tus archivos. (Máx 50MB)
        </p>
        
        <label className="relative cursor-pointer bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-6 rounded-md shadow-sm transition-all">
          <span>Seleccionar Archivo</span>
          <input
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleChange}
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 flex items-center gap-3 text-error bg-red-50 rounded-BRAND border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
