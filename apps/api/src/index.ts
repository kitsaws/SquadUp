import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Event, Team, User } from "@squadup/shared";

// Routes
import resumeRoutes from "./routes/resume.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import teamRoutes from "./routes/team.routes.js";
import eventRoutes from "./routes/event.routes.js";
import organizerRoutes from "./routes/organizer.routes.js";
import applicationRoutes from "./routes/application.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Middleware
app.use(helmet());
app.use(cors());
import { clerkMiddleware } from "@clerk/express";
app.use(clerkMiddleware());

// Webhook routes MUST come before express.json() so they can parse raw bodies
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

// API Routes
app.use("/api/resume", resumeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/applications", applicationRoutes);


// General Endpoints
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
