/**
 * Saves a `data:<mime>;base64,<payload>` URL as a file. Goes through a Blob + object URL rather than
 * binding the data URL to an anchor `href`: Angular rewrites such hrefs to `unsafe:`, and bypassing
 * the sanitizer for student-supplied content is not acceptable.
 */
export function downloadDataUrl(fileName: string, dataUrl: string): void {
  const match = /^data:([^;,]*)(?:;[^;,]*)*;base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('Unsupported data URL.');
  }
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: match[1] }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url));
}
