import { saveCheckIn } from "@/app/dashboard/actions";

const QUESTIONS = [
  { key: "energy", label: "Energy", low: "Drained", high: "Energized" },
  { key: "stress", label: "Stress", low: "Calm", high: "Very stressed" },
  { key: "mood", label: "Mood", low: "Low", high: "Great" },
] as const;

/** Private daily check-in. Only the user sees their answers. */
export default function CheckInCard() {
  return (
    <form action={saveCheckIn} className="card stack checkin">
      <div>
        <h2 style={{ marginBottom: 4 }}>How are you feeling today?</h2>
        <p className="small muted" style={{ margin: 0 }}>
          A 10 second check-in, just for you. Nobody else sees it, and it&apos;s deleted after 30 days.
        </p>
      </div>
      {QUESTIONS.map((q) => (
        <fieldset key={q.key} className="scale">
          <legend>{q.label}</legend>
          <span className="scale-end">{q.low}</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="scale-dot">
              <input type="radio" name={q.key} value={n} required />
              <span>{n}</span>
            </label>
          ))}
          <span className="scale-end">{q.high}</span>
        </fieldset>
      ))}
      <div className="row">
        <button className="btn">Check in</button>
        <button className="btn secondary small" name="skip" value="1" formNoValidate>
          Skip today
        </button>
      </div>
    </form>
  );
}
