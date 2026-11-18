import { notFound } from "next/navigation";
import { getEventType, type EventType } from "@/lib/eventTypes";
import { COMMON_PROMPTS, MAX_ANSWER, MAX_NOTE, TOUCHES, type TouchId } from "@/lib/personalize";
import { requireUser } from "@/lib/session";
import { isPrimaryOwner, linkPath } from "@/lib/users";
import { savePersonal } from "../../../actions";

const isOn = (t: EventType, id: TouchId) =>
  ({
    mood: t.personal_mood,
    common: t.personal_common,
    note: !!t.personal_note.trim(),
    goal: t.personal_goal,
    walk: t.personal_walk,
  })[id];

const toggleName: Record<TouchId, string> = {
  mood: "personal_mood",
  common: "personal_common",
  note: "personal_note_on",
  goal: "personal_goal",
  walk: "personal_walk",
};

export default async function Personalize({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  const { id } = await params;
  const { new: isNew, error } = await searchParams;
  const me = await requireUser();
  const t = await getEventType(Number(id), me.id);
  if (!t) notFound();
  const path = linkPath(isPrimaryOwner(me) ? null : me.handle, t.slug);
  const presetPrompt = COMMON_PROMPTS.includes(t.common_prompt) ? t.common_prompt : t.common_prompt ? "__custom" : COMMON_PROMPTS[0];

  return (
    <>
      {isNew && <div className="alert ok">Your link is ready at {path}. One more optional step:</div>}
      <div className="card stack hero">
        <h1>Make it personal</h1>
        <p className="lead" style={{ margin: 0 }}>
          A few small touches make booking with you feel less like a form and more like a friendly hello.
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          Everything here is optional and off until you switch it on. Each idea is grounded in research on how people
          connect. Guests just see the friendly version.
        </p>
      </div>
      {error && <div className="alert error">{error}</div>}

      <form action={savePersonal} className="stack">
        <input type="hidden" name="id" value={t.id} />
        {TOUCHES.map((touch) => (
          <div key={touch.id} className="card touch">
            <label className="touch-head">
              <input type="checkbox" className="touch-toggle" name={toggleName[touch.id]} defaultChecked={isOn(t, touch.id)} />
              <span className="touch-switch" aria-hidden="true" />
              <span>
                <strong className="touch-title">{touch.title}</strong>
                <span className="touch-what">{touch.what}</span>
              </span>
            </label>
            <p className="touch-why">
              <strong>Why it works:</strong> {touch.why} <span className="touch-source">({touch.source})</span>
            </p>

            {touch.id === "common" && (
              <div className="touch-fields grid2">
                <div>
                  <label htmlFor="common_prompt">Topic</label>
                  <select id="common_prompt" name="common_prompt" defaultValue={presetPrompt}>
                    {COMMON_PROMPTS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                    <option value="__custom">Something else...</option>
                  </select>
                  <input
                    name="common_prompt_custom"
                    type="text"
                    maxLength={80}
                    placeholder="Or write your own topic"
                    defaultValue={presetPrompt === "__custom" ? t.common_prompt : ""}
                    style={{ marginTop: 6 }}
                    aria-label="Custom topic"
                  />
                </div>
                <div>
                  <label htmlFor="common_host_answer">Your answer</label>
                  <input id="common_host_answer" name="common_host_answer" type="text" maxLength={MAX_ANSWER} defaultValue={t.common_host_answer} placeholder="Seattle Seahawks" />
                  <div className="hint">Guests see this and can share theirs.</div>
                </div>
              </div>
            )}
            {touch.id === "note" && (
              <div className="touch-fields">
                <label htmlFor="personal_note">Your note</label>
                <textarea
                  id="personal_note"
                  name="personal_note"
                  maxLength={MAX_NOTE}
                  defaultValue={t.personal_note}
                  placeholder="Hi! Looking forward to catching up. Bring your questions, and your coffee."
                />
              </div>
            )}
          </div>
        ))}
        <div className="row">
          <button className="btn">Save personal touches</button>
          <a href="/dashboard/event-types" className="small">
            Skip for now
          </a>
        </div>
      </form>
    </>
  );
}
