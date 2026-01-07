import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Helper function to validate semantic versioning
function isValidSemanticVersion(version: string): boolean {
  const semanticVersionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  return semanticVersionRegex.test(version);
}

// Helper function to validate date format (YYYY-MM-DD)
function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
}

describe('CHANGELOG.md Validation', () => {
  const changelogPath = path.resolve(__dirname, '../../CHANGELOG.md');
  const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
  const changelogLines = changelogContent.split('\n');

  it('should have v1.3.1 entry', () => {
    const v131Line = changelogLines.findIndex(line => line.includes('## [1.3.1]'));
    expect(v131Line).toBeGreaterThan(-1);
  });

  it('should document all 8 issues', () => {
    const v131Section = changelogLines.slice(
      changelogLines.findIndex(line => line.includes('## [1.3.1]')),
      changelogLines.findIndex(line => line.includes('## [1.3.0]'))
    );

    const issueLines = v131Section.filter(line => line.includes('(#'));
    expect(issueLines.length).toBe(8);
  });

  it('should follow semantic versioning format', () => {
    const versionRegex = /\[(\d+\.\d+\.\d+)\]/;
    const versionMatch = changelogContent.match(versionRegex);

    expect(versionMatch).toBeTruthy();
    if (versionMatch) {
      const version = versionMatch[1];
      expect(isValidSemanticVersion(version)).toBeTruthy();
    }
  });

  it('should have a valid date format', () => {
    const dateRegex = /\[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/;
    const dateMatch = changelogContent.match(dateRegex);

    expect(dateMatch).toBeTruthy();
    if (dateMatch) {
      const date = dateMatch[2];
      expect(isValidDateFormat(date)).toBeTruthy();
    }
  });

  it('should follow Keep a Changelog format', () => {
    const expectedSections = ['### Added', '### Fixed', '### Changed', '### Technical'];
    const v131Section = changelogLines.slice(
      changelogLines.findIndex(line => line.includes('## [1.3.1]')),
      changelogLines.findIndex(line => line.includes('## [1.3.0]'))
    );

    expectedSections.forEach(section => {
      const sectionFound = v131Section.some(line => line.trim().startsWith(section));
      expect(sectionFound, `Section ${section} not found`).toBeTruthy();
    });
  });
});