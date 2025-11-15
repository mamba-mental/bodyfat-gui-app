function normaliseDobString(dob?: string): string | null {
  if (!dob) return null;

  const trimmed = dob.trim();
  if (!trimmed) return null;

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle MM/DD/YY or MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split('/').map(part => part.padStart(2, '0'));
    const numericYear = year.length === 2 ? convertTwoDigitYear(parseInt(year, 10)) : parseInt(year, 10);
    return `${numericYear.toString().padStart(4, '0')}-${month}-${day}`;
  }

  // Handle MMDDYY or MMDDYYYY
  if (/^\d{6}$/.test(trimmed)) {
    const month = trimmed.slice(0, 2);
    const day = trimmed.slice(2, 4);
    const year = trimmed.slice(4);
    const numericYear = convertTwoDigitYear(parseInt(year, 10));
    return `${numericYear}-${month}-${day}`;
  }

  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4);
    const month = trimmed.slice(4, 6);
    const day = trimmed.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function convertTwoDigitYear(year: number): number {
  if (Number.isNaN(year)) {
    return new Date().getFullYear();
  }
  const currentYear = new Date().getFullYear() % 100;
  const century = year > currentYear ? 1900 : 2000;
  return century + year;
}

export function calculateAge(dob?: string, fallbackAge?: number): number {
  const normalised = normaliseDobString(dob);
  if (!normalised) {
    return typeof fallbackAge === 'number' ? fallbackAge : NaN;
  }

  const birthDate = new Date(normalised);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function formatAge(dob?: string, fallbackAge?: number): string {
  const age = calculateAge(dob, fallbackAge);
  if (Number.isNaN(age)) {
    return 'Age unavailable';
  }
  return `${age} years`;
}
