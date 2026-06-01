import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Event, Team, User } from "@squadup/shared";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "squadup-api"
  });
});

app.get("/example", (_request, response) => {
  const user: User = {
    id: "user_1",
    name: "SquadUp User",
    email: "user@squadup.local",
    createdAt: new Date().toISOString()
  };

  const team: Team = {
    id: "team_1",
    name: "Launch Squad",
    memberIds: [user.id],
    createdAt: new Date().toISOString()
  };

  const event: Event = {
    id: "event_1",
    teamId: team.id,
    title: "First SquadUp Event",
    startsAt: new Date().toISOString()
  };

  response.json({ user, team, event });
});

app.listen(port, () => {
  console.log(`SquadUp API running on http://localhost:${port}`);
});
