import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthorName, getAuthorToken, setAuthorName } from "@/lib/identity";
import { isWorkstationCloudEnabled } from "@/lib/workstation-client";
import {
  addAttachments,
  addEntry,
  addLink,
  addLinksBulk,
  addSocial,
  canPost as hasAuthorName,
  createSubject,
  deleteAttachment,
  deleteEntry,
  deleteLink,
  deleteSocial,
  deleteSubject,
  getLocalRescueCounts,
  loadWorkstation,
  migrateLocalToCloud,
  replaceSubjectCover,
  rescueTotal,
  updateSubject,
  type NewSubjectInput,
  type RescueCounts,
  type SocialPlatform,
  type WorkstationAttachment,
  type WorkstationPriority,
  type WorkstationSnapshot,
} from "@/lib/workstation";
import { Notice } from "./parts";
import SubjectDetail from "./SubjectDetail";
import SubjectList from "./SubjectList";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function TeamWorkstation() {
  const [snapshot, setSnapshot] = useState<WorkstationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(() => getAuthorName());
  const [openId, setOpenId] = useState<string | null>(null);
  const [rescue, setRescue] = useState<RescueCounts | null>(null);
  const [rescuing, setRescuing] = useState(false);
  const [rescueDone, setRescueDone] = useState("");
  const blobUrls = useRef<string[]>([]);

  const reload = useCallback(async () => {
    const data = await loadWorkstation();
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrls.current = data.source === "local" ? Object.values(data.attachmentUrls) : [];
    setSnapshot(data);
    // Stranded posts? They live in this browser only while the team is on cloud.
    try {
      setRescue(data.source === "cloud" ? getLocalRescueCounts() : null);
    } catch {
      setRescue(null);
    }
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await reload();
      } catch (err) {
        if (live) setError(message(err));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [reload]);

  useEffect(
    () => () => {
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  // Keep the board fresh so teammates see each other's posts without a refresh.
  useEffect(() => {
    if (!isWorkstationCloudEnabled) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void reload().catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      await reload();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const subject = snapshot?.subjects.find((item) => item.id === openId) ?? null;
  const entries = (snapshot?.entries ?? []).filter((entry) => entry.subjectId === openId);
  const links = (snapshot?.links ?? []).filter((link) => link.subjectId === openId);
  const socials = (snapshot?.socials ?? []).filter((social) => social.subjectId === openId);
  const attachments = (snapshot?.attachments ?? []).filter(
    (attachment) => attachment.subjectId === openId,
  );
  const isCloud = snapshot?.source === "cloud";

  return (
    <div className="space-y-4 ws-desk">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold brand-heading lg:text-xl">Team Workstation</h3>
          <p className="brand-copy text-[11px] leading-relaxed mt-0.5 lg:text-sm lg:mt-1">
            Subjects for the team to study — projects, GitHub, Vercel, anything worth learning
            together.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] flex-shrink-0",
            isCloud
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/50",
          )}
          title={
            isCloud
              ? "Synced to Supabase for the whole team"
              : snapshot?.cloudError
                ? "The shared board could not be read — this browser is holding the board for now"
                : "No Supabase project configured — saved in this browser only"
          }
        >
          {isCloud ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isCloud ? "Team cloud" : "This browser"}
        </span>
      </div>

      {snapshot?.cloudError && (
        <Notice tone="info">
          <span className="block">
            The shared team board could not be reached, so this browser is keeping its own copy for
            now.
          </span>
          <span className="block mt-1 font-mono text-[11px] opacity-80">{snapshot.cloudError}</span>
          <span className="block mt-1">
            Apply the Team Workstation migration in Supabase (SQL editor, or let Lovable Cloud run
            it) and reload to put everyone back on the shared board.
          </span>
        </Notice>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 flex items-center gap-2">
        <Users className="w-4 h-4 brand-accent-text flex-shrink-0" />
        <input
          className="admin-input flex-1 min-w-0"
          placeholder="Your display name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setAuthorName(event.target.value);
          }}
        />
      </div>
      {!hasAuthorName() && (
        <Notice tone="info">
          Add your display name first — every comment, link and image gets stamped with it, and it
          is the only way the team knows who posted what.
        </Notice>
      )}

      {error && <Notice>{error}</Notice>}

      {rescueDone && <Notice tone="info">{rescueDone}</Notice>}

      {!loading && rescue && rescueTotal(rescue) > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
          <p className="text-xs font-bold brand-heading">
            This browser holds posts that never reached the team cloud
          </p>
          <p className="brand-copy text-[11px] leading-relaxed mt-1">
            {rescue.subjects} subject{rescue.subjects === 1 ? "" : "s"} · {rescue.entries} note
            {rescue.entries === 1 ? "" : "s"}/comment{rescue.entries === 1 ? "" : "s"} ·{" "}
            {rescue.links} link{rescue.links === 1 ? "" : "s"} · {rescue.socials} social
            {rescue.socials === 1 ? "" : "s"} · {rescue.attachments} file
            {rescue.attachments === 1 ? "" : "s"} — saved here while the shared board was
            unreachable. Move them once and everyone sees them.
          </p>
          <button
            type="button"
            disabled={rescuing || busy || !hasAuthorName()}
            onClick={() => {
              setRescuing(true);
              setError("");
              migrateLocalToCloud()
                .then(async (moved) => {
                  const total = rescueTotal(moved);
                  setRescue(null);
                  setRescueDone(
                    total > 0
                      ? `Moved ${total} post${total === 1 ? "" : "s"} to the team cloud — nothing is stranded in this browser anymore.`
                      : "Those posts were already on the team cloud — nothing left behind here.",
                  );
                  await reload();
                })
                .catch((err: unknown) => setError(message(err)))
                .finally(() => setRescuing(false));
            }}
            className="btn-primary text-white px-4 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50 mt-2.5"
          >
            {rescuing ? "Moving…" : "Move to team cloud"}
          </button>
          {!hasAuthorName() && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
              Add your display name above first — the move stamps posts with it.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-24 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : subject ? (
        <SubjectDetail
          subject={subject}
          entries={entries}
          links={links}
          socials={socials}
          attachments={attachments}
          attachmentUrls={snapshot?.attachmentUrls ?? {}}
          myToken={getAuthorToken()}
          busy={busy}
          canPost={hasAuthorName()}
          onBack={() => setOpenId(null)}
          onPriority={(priority: WorkstationPriority) =>
            run(() => updateSubject(subject.id, { priority }))
          }
          onDeleteSubject={async () => {
            if (!window.confirm(`Delete "${subject.title}" and everything posted under it?`))
              return;
            await run(async () => {
              await deleteSubject(subject.id);
              setOpenId(null);
            });
          }}
          onCover={(file) => run(() => replaceSubjectCover(subject.id, file))}
          onUpdateSubject={(patch) => run(() => updateSubject(subject.id, patch))}
          onAddEntry={(kind, body, priority) =>
            run(() => addEntry({ subjectId: subject.id, kind, body, priority }))
          }
          onDeleteEntry={(id) => run(() => deleteEntry(id))}
          onAddLink={(kind, url, label) =>
            run(() => addLink({ subjectId: subject.id, kind, url, label }))
          }
          onAddLinksBulk={(kind, urls, label) =>
            run(() =>
              addLinksBulk({ subjectId: subject.id, kind, urls, label }).then(() => undefined),
            )
          }
          onDeleteLink={(id) => run(() => deleteLink(id))}
          onAddSocial={(platform: SocialPlatform, url: string, label: string) =>
            run(() => addSocial({ subjectId: subject.id, platform, url, label }))
          }
          onDeleteSocial={(id) => run(() => deleteSocial(id))}
          onUpload={(files) => run(() => addAttachments(subject.id, files))}
          onDeleteAttachment={(attachment: WorkstationAttachment) =>
            run(() => deleteAttachment(attachment.id, attachment.storagePath))
          }
        />
      ) : (
        <SubjectList
          subjects={snapshot?.subjects ?? []}
          entries={snapshot?.entries ?? []}
          links={snapshot?.links ?? []}
          socials={snapshot?.socials ?? []}
          attachments={snapshot?.attachments ?? []}
          busy={busy}
          canPost={hasAuthorName()}
          onOpen={setOpenId}
          onCreate={(input: NewSubjectInput) => run(() => createSubject(input))}
        />
      )}

      {!loading && !subject && (snapshot?.subjects.length ?? 0) > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-white/25 inline-flex items-center gap-1.5">
          <FolderOpen className="w-3 h-3" />
          {snapshot?.subjects.length ?? 0} subject
          {(snapshot?.subjects.length ?? 0) === 1 ? "" : "s"} in the library.
        </p>
      )}
    </div>
  );
}
