import type { Property } from '../types/property';

/**
 * Triggers the direct download of the official static PDF dossier.
 * Also returns a promise that resolves once the download request is launched.
 */
export async function downloadPropertyDossier(property: Property): Promise<boolean> {
  try {
    const link = document.createElement('a');
    link.href = property.pdfPath;
    link.download = property.pdfFileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}
