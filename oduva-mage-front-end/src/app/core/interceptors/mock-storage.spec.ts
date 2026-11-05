import { assignmentsFixture } from '../../../../mocks/fixtures/assignments.fixture';
import { STORAGE_KEY, readStorage } from '../../../../mocks/mock-storage';

describe('mock-storage', () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it('seeds assignments and submissions from fixtures when storage is empty', () => {
    const storage = readStorage();

    expect(storage.assignments).toEqual(assignmentsFixture);
    expect(storage.submissions).toEqual([]);
    expect(storage.session).toBeNull();
  });

  it('fills missing assignments/submissions when stored JSON predates them', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ applications: [], session: null }));

    const storage = readStorage();

    expect(storage.assignments).toEqual(assignmentsFixture);
    expect(storage.submissions).toEqual([]);
  });

  it('defaults maxMarks to 100 for stored assignments that predate it', () => {
    const legacy = { id: 'old', title: 'T', question: 'Q', createdAt: 'x', createdByEmail: 'y' };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ applications: [], session: null, assignments: [legacy], submissions: [] })
    );

    expect(readStorage().assignments[0].maxMarks).toBe(100);
  });

  it('seeds every fixture assignment with a positive maxMarks', () => {
    expect(assignmentsFixture.every((a) => a.maxMarks > 0)).toBeTrue();
  });

  it('upgrades without losing existing applications', () => {
    const application = { id: 'app-1' };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ applications: [application], session: null }));

    expect(readStorage().applications as unknown[]).toEqual([application]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string).assignments.length).toBe(
      assignmentsFixture.length
    );
  });
});
