const SHA256_RE = /^[a-f0-9]{64}$/;
const statuses = new Set(['passed', 'failed', 'timeout', 'tool-missing']);

const sameArray = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

export function validateProjectReport(report, manifest) {
  const errors = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return { ok: false, errors: ['Report ist kein Objekt.'], integrity: 'invalid', evidenceEligible: false };
  }
  if (report.schemaVersion !== 1) errors.push('schemaVersion muss 1 sein.');
  if (report.projectId !== manifest.projectId) errors.push('projectId stimmt nicht mit dem Manifest überein.');
  if (report.projectVersion !== manifest.projectVersion) errors.push('projectVersion stimmt nicht mit dem Manifest überein.');
  if (report.runner !== 'python-pytest') errors.push('Unbekannter Runner.');
  if (!report.reportId || typeof report.reportId !== 'string') errors.push('reportId fehlt.');
  if (!Number.isFinite(Date.parse(report.runAt))) errors.push('runAt ist ungültig.');
  if (!statuses.has(report.status)) errors.push('status ist ungültig.');
  if (!Number.isInteger(report.exitCode)) errors.push('exitCode muss eine ganze Zahl sein.');
  if (report.status === 'passed' && report.exitCode !== 0) errors.push('Ein bestandener Report braucht exitCode 0.');
  if (report.status !== 'passed' && report.exitCode === 0) errors.push('Ein fehlgeschlagener Report darf nicht exitCode 0 tragen.');
  if (!Number.isFinite(report.durationMs) || report.durationMs < 0) errors.push('durationMs ist ungültig.');
  if (typeof report.stdout !== 'string' || typeof report.stderr !== 'string') errors.push('stdout und stderr müssen Strings sein.');
  if (report.stdout?.length > 65536 || report.stderr?.length > 65536) errors.push('Reportausgabe überschreitet 64 KiB.');
  if (typeof report.stdoutTruncated !== 'boolean' || typeof report.stderrTruncated !== 'boolean') errors.push('Truncation-Flags fehlen.');

  const expectedCommand = ['python', '-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', ...(manifest.testPaths || [])];
  if (!Array.isArray(report.command) || !sameArray(report.command, expectedCommand)) errors.push('Testkommando entspricht nicht dem Manifest.');
  if (!Array.isArray(report.files)) {
    errors.push('Dateiliste fehlt.');
  } else {
    const reported = new Map();
    for (const file of report.files) {
      if (!file?.path || reported.has(file.path)) errors.push(`Doppelter oder fehlender Dateipfad ${file?.path || '(leer)'}.`);
      else reported.set(file.path, file);
    }
    for (const expected of manifest.requiredFiles || []) {
      const file = reported.get(expected.path);
      if (!file?.present) errors.push(`Pflichtdatei fehlt: ${expected.path}.`);
      else if (expected.sha256 && (!SHA256_RE.test(file.sha256 || '') || file.sha256 !== expected.sha256)) errors.push(`Hash stimmt nicht: ${expected.path}.`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    integrity: errors.length ? 'invalid' : 'self-reported',
    evidenceEligible: false,
  };
}
