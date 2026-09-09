import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CatalogData } from '../app/types';
import { Button } from './Button';
import { BrandWordmark } from './Brand';
import { minutesLabel } from './learner-labels';

const budgetOptions = [90, 180, 360];

function trackFacts(catalog: CatalogData, trackId: string) {
  const track = catalog.tracks.find((item) => item.trackId === trackId);
  const inTrack = (catalog.learningModules || []).filter((module) => module.trackIds.includes(trackId));
  const minutes = inTrack.reduce((total, module) => total + module.estimatedMinutes, 0);
  return {
    description: track?.description ?? '',
    facts: `${inTrack.length} ${inTrack.length === 1 ? 'Modul' : 'Module'} · ${minutesLabel(minutes)} · ${track?.competencyIds.length ?? 0} Kompetenzen`,
  };
}

export function OnboardingOverlay({ catalog, initialTrackId, onDone, onSkip }: {
  catalog: CatalogData;
  initialTrackId: string;
  onDone: (trackId: string, weeklyMinutes: number) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [trackId, setTrackId] = useState(initialTrackId);
  const [minutes, setMinutes] = useState(180);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const facts = useMemo(() => Object.fromEntries(catalog.tracks.map((track) => [track.trackId, trackFacts(catalog, track.trackId)])), [catalog]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onSkip(); };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [onSkip]);

  return (
    <div class="onboarding-backdrop">
      <section class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <p class="card-kicker">Schritt {step + 1} von 3</p>
        {step === 0 && (
          <>
            <p class="onboarding-welcome">Willkommen bei</p>
            <h1 id="onboarding-title" tabIndex={-1} ref={headingRef}>
              <span class="visually-hidden">Willkommen bei argmin</span>
              <span class="onboarding-wordmark" aria-hidden="true"><BrandWordmark /></span>
            </h1>
            <p class="lede onboarding-lede"><strong>Dein lokaler Lernpfad für KI.</strong> Lektionen, Aufgaben mit frischen Varianten und ein Review, das dich rechtzeitig erinnert. Ohne Account, dein Fortschritt bleibt in diesem Browser.</p>
            <div class="actions">
              <Button variant="primary" onClick={() => setStep(1)}>Pfad wählen</Button>
              <Button variant="ghost" onClick={onSkip}>Überspringen</Button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 id="onboarding-title" tabIndex={-1} ref={headingRef}>Welchen Weg willst du gehen?</h1>
            <p class="lede">Du kannst jederzeit frei springen und den Pfad später in den Einstellungen wechseln. Dein Fortschritt bleibt dabei erhalten.</p>
            <div class="onboarding-tracks" role="radiogroup" aria-label="Lernpfad">
              {catalog.tracks.map((track) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={trackId === track.trackId}
                  class={trackId === track.trackId ? 'track-pick is-active' : 'track-pick'}
                  onClick={() => setTrackId(track.trackId)}
                  key={track.trackId}
                >
                  <strong>{track.title}</strong>
                  <span>{facts[track.trackId]?.description}</span>
                  <small>{facts[track.trackId]?.facts}</small>
                </button>
              ))}
            </div>
            <div class="actions">
              <Button variant="primary" onClick={() => setStep(2)}>Weiter</Button>
              <Button variant="ghost" onClick={onSkip}>Überspringen</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 id="onboarding-title" tabIndex={-1} ref={headingRef}>Wie viel Zeit hast du pro Woche?</h1>
            <p class="lede">Daraus baut die Plattform deinen Wochenplan. Ändern kannst du das jederzeit in den Einstellungen.</p>
            <div class="segmented onboarding-budget" role="radiogroup" aria-label="Wochenbudget">
              {budgetOptions.map((option) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={minutes === option}
                  class={minutes === option ? 'is-active' : undefined}
                  onClick={() => setMinutes(option)}
                  key={option}
                >
                  {minutesLabel(option)} / Woche
                </button>
              ))}
            </div>
            <div class="actions">
              <Button variant="primary" onClick={() => onDone(trackId, minutes)}>Los geht's</Button>
              <Button variant="ghost" onClick={onSkip}>Überspringen</Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
