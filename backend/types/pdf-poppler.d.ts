declare module 'pdf-poppler' {
  export interface ConvertOptions {
    format?: 'png' | 'jpeg' | 'tiff';
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
    width?: number;
    height?: number;
  }

  const pdfPoppler: {
    convert: (file: string, options: ConvertOptions) => Promise<void>;
  };

  export default pdfPoppler;
}
