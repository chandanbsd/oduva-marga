import { readFileAsDataUrl } from './read-file-as-data-url';

describe('readFileAsDataUrl', () => {
  it('resolves a data URL carrying the file mime type and base64 bytes', async () => {
    const file = new File([new Uint8Array([104, 105])], 'a.txt', { type: 'text/plain' });

    expect(await readFileAsDataUrl(file)).toBe('data:text/plain;base64,aGk=');
  });
});
