import { Request, Response } from "express";
import { Webhook } from "svix";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Missing CLERK_WEBHOOK_SECRET" });
  }

  // Get the headers
  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  // If there are no Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: "Missing Svix headers" });
  }

  // Get the body
  const payload = req.body;
  const body = payload.toString();

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // Handle the webhook event
  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim() || "SquadUp User";

    try {
      await prisma.user.upsert({
        where: { id: id },
        update: {
          email,
          name,
        },
        create: {
          id, // Use Clerk's ID as our Postgres ID
          email,
          name,
        },
      });
      console.log(`Synced user ${id} to database`);
    } catch (dbError) {
      console.error("Error syncing user to database:", dbError);
      return res.status(500).json({ error: "Database error" });
    }
  }

  if (eventType === "user.deleted") {
    try {
      await prisma.user.delete({
        where: { id: id },
      });
      console.log(`Deleted user ${id} from database`);
    } catch (dbError) {
      console.error("Error deleting user from database:", dbError);
    }
  }

  return res.status(200).json({ success: true });
};
