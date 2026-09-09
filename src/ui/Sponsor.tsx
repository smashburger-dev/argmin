import { useEffect, useState } from 'preact/hooks';
import { Button } from './Button';

const SPONSOR_EMAIL = 'no8@tuta.com';
// Noa: Ko-fi-URL eintragen, sobald das Konto steht, z.B. 'https://ko-fi.com/deinname'.
// Bei leerem String zeigt das Fenster keinen Ko-fi-Knopf.
const KOFI_URL = '';

async function copyEmail(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(SPONSOR_EMAIL);
    return true;
  } catch {
    // Fallback für unsichere Kontexte (z.B. LAN-IP ohne HTTPS).
    const area = document.createElement('textarea');
    area.value = SPONSOR_EMAIL;
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

function SponsorModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="sponsor-backdrop" onClick={onClose}>
      <div class="sponsor-modal" role="dialog" aria-modal="true" aria-labelledby="sponsor-title" tabIndex={-1} ref={(element: HTMLElement | null) => element?.focus()} onClick={(event) => event.stopPropagation()}>
        <h2 id="sponsor-title">Werde Sponsor</h2>
        <p>argmin bleibt für alle frei. Mit einem Platz im Kopfbereich unterstützt du Betrieb und Weiterentwicklung. Ein Platz gilt für einen Monat und kann danach verlängert oder neu vergeben werden.</p>
        <p>Schreib an <strong>{SPONSOR_EMAIL}</strong> mit dem Betreff „Sponsor", du erhältst alle Details zu Zahlung und Platzierung.</p>
        <div class="sponsor-actions">
          <Button href={`mailto:${SPONSOR_EMAIL}?subject=Sponsor%20argmin`}>E-Mail-Programm öffnen</Button>
          <Button
            variant="secondary"
            onClick={() => {
              void copyEmail().then((ok) => {
                if (ok) setCopied(true);
              });
            }}
          >
            {copied ? 'Kopiert' : 'E-Mail kopieren'}
          </Button>
          {KOFI_URL ? <Button variant="secondary" href={KOFI_URL} target="_blank" rel="noreferrer">Auf Ko-fi unterstützen</Button> : null}
          <Button variant="ghost" onClick={onClose}>Schließen</Button>
        </div>
      </div>
    </div>
  );
}

export function SponsorSlots() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div class="sponsor-slots" role="group" aria-label="Sponsoren">
        {[1, 2, 3].map((slot) => (
          <button type="button" class="sponsor-slot" onClick={() => setOpen(true)} key={slot}>
            Werde Sponsor
          </button>
        ))}
      </div>
      {open ? <SponsorModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
