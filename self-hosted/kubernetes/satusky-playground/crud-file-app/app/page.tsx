"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";

type Status = "todo" | "doing" | "done";
type AuthFlow = "signIn" | "signUp";
type JobEvent = {
  _id: string;
  kind: "cron" | "scheduled";
  message: string;
  requestedBySubject?: string;
  requestedByName?: string;
  createdAt: number;
};
type CrudFile = {
  _id: Id<"crudFiles">;
  name: string;
  size: number;
  url: string | null;
};
type CrudItem = {
  _id: Id<"crudItems">;
  title: string;
  body: string;
  status: Status;
  ownerName?: string;
  ownerSubject?: string;
  files: CrudFile[];
};

export default function Page() {
  const { signIn, signOut } = useAuthActions();
  const items = useQuery(api.items.list) ?? [];
  const jobEvents = useQuery(api.jobs.listEvents) ?? [];
  const runtime = useQuery(api.items.runtimeInfo);
  const createItem = useMutation(api.items.create);
  const updateItem = useMutation(api.items.update);
  const deleteItem = useMutation(api.items.remove);
  const scheduleDelayedEvent = useMutation(api.jobs.scheduleDelayedEvent);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const attachFile = useMutation(api.files.attach);
  const deleteFile = useMutation(api.files.remove);
  const [title, setTitle] = useState("Test record");
  const [body, setBody] = useState("CRUD plus file storage against convex-test-101.");
  const [busy, setBusy] = useState<string | null>(null);
  const [authFlow, setAuthFlow] = useState<AuthFlow>("signIn");
  const [authError, setAuthError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<number | null>(null);

  async function passwordAuth(formData: FormData) {
    formData.set("flow", authFlow);
    setAuthError(null);
    try {
      await signIn("password", formData);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  async function create() {
    setBusy("Creating item");
    try {
      await createItem({ title, body });
    } finally {
      setBusy(null);
    }
  }

  async function scheduleJob() {
    setBusy("Scheduling delayed job");
    try {
      const result = await scheduleDelayedEvent({
        delayMs: 5000,
        message: "Manual delayed job from CRUD/file test app",
      });
      setScheduledFor(result.scheduledFor);
    } finally {
      setBusy(null);
    }
  }

  async function upload(itemId: Id<"crudItems">, file: File | null) {
    if (!file) {
      return;
    }
    setBusy(`Uploading ${file.name}`);
    try {
      const postUrl = await generateUploadUrl();
      const response = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed with HTTP ${response.status}`);
      }
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      await attachFile({
        itemId,
        storageId,
        name: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">convex-test-101</p>
          <h1>Self-hosted Convex CRUD and file storage test</h1>
          <p>
            Exercises Convex database writes, queries, auth identity, environment
            variables, upload URLs, file URL retrieval, and storage deletion.
          </p>
        </div>
        <div className="auth">
          <Authenticated>
            <span className="pill">Convex Auth session active</span>
            <button onClick={() => void signOut()}>Sign out</button>
          </Authenticated>
          <Unauthenticated>
            <form action={passwordAuth} className="auth-form">
              <input name="email" type="email" placeholder="Email" required />
              <input name="password" type="password" placeholder="Password" required />
              <button type="submit">{authFlow === "signIn" ? "Sign in" : "Sign up"}</button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthError(null);
                  setAuthFlow(authFlow === "signIn" ? "signUp" : "signIn");
                }}
              >
                {authFlow === "signIn" ? "Create account" : "Use existing account"}
              </button>
              {authError ? <p className="error">{authError}</p> : null}
            </form>
          </Unauthenticated>
        </div>
      </section>

      <Unauthenticated>
        <section className="card">
          <h2>Sign in required</h2>
          <p>
            Create an account or sign in to test per-user data isolation, file upload,
            retrieval, deletion, cron visibility, and scheduled jobs.
          </p>
        </section>
      </Unauthenticated>

      <Authenticated>
        <section className="grid">
          <div className="card">
            <h2>Runtime</h2>
            <pre>{JSON.stringify(runtime, null, 2)}</pre>
          </div>
          <div className="card">
            <h2>Create Item</h2>
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Body
              <textarea value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <button onClick={create} disabled={Boolean(busy)}>
              Create
            </button>
            {busy ? <p className="busy">{busy}...</p> : null}
          </div>
        </section>

        <section className="card">
          <div className="row">
            <div>
              <h2>Cron and Scheduled Jobs</h2>
              <p className="meta">
                Cron writes every minute. The button schedules a one-off mutation after 5 seconds.
              </p>
              {scheduledFor ? (
                <p className="meta">Last scheduled for {new Date(scheduledFor).toLocaleString()}</p>
              ) : null}
            </div>
            <div className="actions">
              <button onClick={scheduleJob} disabled={Boolean(busy)}>
                Schedule delayed job
              </button>
            </div>
          </div>
          <div className="events">
            {jobEvents.length === 0 ? <p className="meta">No job events yet.</p> : null}
            {jobEvents.map((event: JobEvent) => (
              <div className="event" key={event._id}>
                <span className={`badge ${event.kind}`}>{event.kind}</span>
                <span>{event.message}</span>
                <span className="meta">{new Date(event.createdAt).toLocaleString()}</span>
                {event.requestedByName || event.requestedBySubject ? (
                  <span className="meta">
                    by {event.requestedByName ?? event.requestedBySubject}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="items">
          <h2>Items</h2>
          {items.length === 0 ? <p>No records yet for this user.</p> : null}
          {items.map((item: CrudItem) => (
            <article className="item" key={item._id}>
              <div className="row">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <p className="meta">
                    status={item.status} owner={item.ownerName ?? item.ownerSubject ?? "anonymous"}
                  </p>
                </div>
                <div className="actions">
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateItem({
                        id: item._id,
                        title: item.title,
                        body: item.body,
                        status: event.target.value as Status,
                      })
                    }
                  >
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="done">done</option>
                  </select>
                  <button onClick={() => deleteItem({ id: item._id })}>Delete item</button>
                </div>
              </div>
              <label className="upload">
                Upload file
                <input
                  type="file"
                  onChange={(event) => upload(item._id, event.currentTarget.files?.[0] ?? null)}
                />
              </label>
              <div className="files">
                {item.files.map((file: CrudFile) => (
                  <div className="file" key={file._id}>
                    <a href={file.url ?? "#"} target="_blank" rel="noreferrer">
                      {file.name}
                    </a>
                    <span>{file.size} bytes</span>
                    <button onClick={() => deleteFile({ id: file._id })}>Delete file</button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </Authenticated>
    </main>
  );
}
