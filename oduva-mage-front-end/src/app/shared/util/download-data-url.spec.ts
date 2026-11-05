import { downloadDataUrl } from './download-data-url';

describe('downloadDataUrl', () => {
  let createObjectUrl: jasmine.Spy;
  let revokeObjectUrl: jasmine.Spy;
  let downloadNames: string[];
  let hrefs: string[];

  beforeEach(() => {
    downloadNames = [];
    hrefs = [];
    createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloadNames.push(this.download);
      hrefs.push(this.href);
    });
  });

  it('creates a Blob of the decoded bytes with the data URL mime type', async () => {
    downloadDataUrl('notes.txt', 'data:text/plain;base64,aGk=');

    const blob = createObjectUrl.calls.mostRecent().args[0] as Blob;
    expect(blob.type).toBe('text/plain');
    expect(blob.size).toBe(2);
    expect(await blob.text()).toBe('hi');
  });

  it('sets the anchor download name exactly as given and points it at the object URL', () => {
    downloadDataUrl('my résumé (1).pdf', 'data:application/pdf;base64,aGk=');

    expect(downloadNames).toEqual(['my résumé (1).pdf']);
    expect(hrefs).toEqual(['blob:test']);
  });

  it('revokes the object URL', async () => {
    downloadDataUrl('notes.txt', 'data:text/plain;base64,aGk=');
    await new Promise((resolve) => setTimeout(resolve));

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test');
  });
});
