import Papa from 'papaparse';
import * as ss from 'simple-statistics';

export interface DatasetMeta {
  filename: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  uploadedAt: string;
  sessionId: string;
}

export interface ColumnProfile {
  name: string;
  detectedType: 'numeric' | 'text' | 'date' | 'boolean';
  nullCount: number;
  nullPercent: number;
  uniqueCount: number;
  stats: any; 
}

export interface Warning {
  type: 'pii' | 'high_nulls' | 'duplicate_header' | 'insufficient_data';
  column: string | null;
  message: string;
}

export interface AnalysisResult {
  correlationMatrix: Record<string, Record<string, number>>;
  distributions: any[];
  warnings: Warning[];
}

export interface DataQualityReport {
  summary: string;
  totalMissing: number;
  piiWarnings: Warning[];
  highNullWarnings: Warning[];
  qualityScore: number;
}

export const generateSessionId = () => Math.random().toString(36).substring(7);

export const detectDataType = (values: any[]): 'numeric' | 'text' | 'date' | 'boolean' => {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';
  
  const numericCount = nonNull.filter(v => !isNaN(Number(v))).length;
  if (numericCount / nonNull.length > 0.8) return 'numeric';
  
  const boolCount = nonNull.filter(v => ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).toLowerCase())).length;
  if (boolCount / nonNull.length > 0.8) return 'boolean';

  const dateCount = nonNull.filter(v => !isNaN(Date.parse(v))).length;
  if (dateCount / nonNull.length > 0.8) return 'date';

  return 'text';
};

export const parseCSV = (file: File): Promise<{ data: any[], meta: DatasetMeta, warnings: Warning[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        let headers = results.meta.fields || [];
        const warnings: Warning[] = [];
        
        const headerCounts: Record<string, number> = {};
        headers = headers.map(h => {
          if (!h) h = 'Unnamed';
          if (headerCounts[h]) {
            warnings.push({ type: 'duplicate_header', column: h, message: `Duplicate header renamed.` });
            headerCounts[h]++;
            return `${h} (${headerCounts[h]-1})`;
          }
          headerCounts[h] = 1;
          return h;
        });
        
        const cleanData = results.data.map((row: any) => {
          const newRow: any = {};
          (results.meta.fields || []).forEach((oldField, idx) => {
            newRow[headers[idx]] = row[oldField];
          });
          return newRow;
        });

        const meta: DatasetMeta = {
          filename: file.name,
          rowCount: cleanData.length,
          columnCount: headers.length,
          columns: headers,
          uploadedAt: new Date().toISOString(),
          sessionId: generateSessionId()
        };

        resolve({ data: cleanData, meta, warnings });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const profileData = (data: any[], columns: string[], initialWarnings: Warning[] = []): { profiles: ColumnProfile[], warnings: Warning[] } => {
  const warnings = [...initialWarnings];
  const profiles = columns.map(col => {
    const rawValues = data.map(row => row[col]);
    const nulls = rawValues.filter(v => v === null || v === undefined || v === '');
    const nullPercent = rawValues.length ? (nulls.length / rawValues.length) * 100 : 0;
    
    if (nullPercent > 80) {
      warnings.push({ type: 'high_nulls', column: col, message: `La columna tiene ${nullPercent.toFixed(1)}% de valores nulos (vacíos).` });
    }

    const type = detectDataType(rawValues);
    const uniqueVals = new Set(rawValues.filter(v => v !== null && v !== undefined && v !== ''));
    
    // Exact PII Logic
    if (type === 'text') {
      const piiFound = rawValues.some(v => {
        if (!v) return false;
        const str = String(v).toLowerCase();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) || /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(str);
      });
      if (piiFound) {
        warnings.push({ type: 'pii', column: col, message: `Información de Identificación Personal Sensible Detectada (Emails/Phones).` });
      }
    }

    let stats: any = {};
    if (type === 'numeric') {
      const nums = rawValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        const q1 = ss.quantile(nums, 0.25);
        const q3 = ss.quantile(nums, 0.75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        // Exact Outliers based on IQR
        const outliers = nums.filter(n => n < lowerBound || n > upperBound);

        stats = {
          min: ss.min(nums),
          max: ss.max(nums),
          mean: ss.mean(nums),
          median: ss.median(nums),
          std: nums.length > 1 ? ss.standardDeviation(nums) : 0,
          q1,
          q3,
          iqr,
          lowerBound,
          upperBound,
          outliers,
          outlierCount: outliers.length
        };
      }
    }

    return {
      name: col,
      detectedType: type,
      nullCount: nulls.length,
      nullPercent,
      uniqueCount: uniqueVals.size,
      stats
    };
  });

  return { profiles, warnings };
};

export const generateQualityReport = (meta: DatasetMeta, profiles: ColumnProfile[], warnings: Warning[]): DataQualityReport => {
  const piiWarnings = warnings.filter(w => w.type === 'pii');
  const highNullWarnings = warnings.filter(w => w.type === 'high_nulls');
  
  const totalMissing = profiles.reduce((acc, p) => acc + p.nullCount, 0);
  const totalCells = meta.rowCount * meta.columnCount;
  const missingPct = totalCells ? ((totalMissing / totalCells) * 100).toFixed(1) : "0";

  let summary = `El dataset "${meta.filename}" ha sido procesado exitosamente en nivel local. `;
  summary += `Contiene un total de ${meta.rowCount} filas de registros distribuidos en ${meta.columnCount} columnas seleccionadas. `;
  
  if (totalMissing > 0) {
    summary += `De la matriz completa, el ${missingPct}% de las intersecciones se encuentran nulas o vacías. `;
  } else {
    summary += `Estructuralmente, el conjunto de datos está 100% íntegro (cero valores nulos detectados en la selección). `;
  }

  const numCols = profiles.filter(p => p.detectedType === 'numeric');
  if (numCols.length > 0) {
    summary += `Existen ${numCols.length} variables numéricas analizadas bajo métodos IQR. `;
    const totalOutliers = numCols.reduce((acc, p) => acc + (p.stats.outlierCount || 0), 0);
    summary += totalOutliers > 0 ? `Se han detectado un total de ${totalOutliers} outliers (valores atípicos) que podrían sesgar los promedios. ` : `No se detectaron outliers severos en las variables numéricas métricas. `;
  }

  if (piiWarnings.length > 0) {
    summary += `PRECAUCIÓN CON DATOS SENSIBLES: Se bloqueó la anonimización para la exportación de ${piiWarnings.length} posibles columnas que alojan PII (información de identificación personal).`;
  }

  let score = 100;
  const missingPctNum = totalCells ? (totalMissing / totalCells) * 100 : 0;
  score -= Math.min(30, missingPctNum * 0.5);
  score -= highNullWarnings.length * 5;
  if (piiWarnings.length > 0) score -= 15;
  score -= warnings.filter(w => w.type === 'duplicate_header').length * 2;
  const qualityScore = Math.max(0, Math.round(score));

  return {
    summary,
    totalMissing,
    piiWarnings,
    highNullWarnings,
    qualityScore
  };
};

export const generateCorrelationMatrix = (data: any[], profiles: ColumnProfile[], warnings: Warning[]): Record<string, Record<string, number>> => {
  const numCols = profiles.filter(p => p.detectedType === 'numeric').map(p => p.name);
  const matrix: Record<string, Record<string, number>> = {};
  
  if (data.length < 30) {
    warnings.push({ type: 'insufficient_data', column: null, message: `Menos de 30 filas. Se abortó el cálculo de correlación de Pearson para evitar falsos positivos matemáticos.` });
    return matrix;
  }

  numCols.forEach(col1 => {
    matrix[col1] = {};
    numCols.forEach(col2 => {
      if (col1 === col2) {
        matrix[col1][col2] = 1;
      } else {
        const pairs = data
          .map(row => [Number(row[col1]), Number(row[col2])])
          .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
        
        if (pairs.length > 1) {
          try {
            matrix[col1][col2] = ss.sampleCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
          } catch(e) {
            matrix[col1][col2] = 0;
          }
        } else {
          matrix[col1][col2] = 0;
        }
      }
    });
  });

  return matrix;
};
