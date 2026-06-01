import type { User } from "@squadup/shared";

const demoUser: User = {
  id: "user_1",
  name: "SquadUp User",
  email: "user@squadup.local",
  createdAt: new Date().toISOString()
};

export function App() {
  return (
    <main className="app-shell">
      <section className="status-panel" aria-label="Application status">
        <p className="eyebrow">SquadUp</p>
        <h1>SquadUp Frontend Running</h1>
        <p className="supporting-copy">Signed in demo user: {demoUser.name}</p>
      </section>
    </main>
  );
}
