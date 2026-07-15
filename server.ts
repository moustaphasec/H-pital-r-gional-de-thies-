import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db";
import { appointments } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./src/middleware/auth";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const { name, phone, email, specialty, date, message } = req.body;
      const newAppointment = await db.insert(appointments).values({
        name,
        phone,
        email,
        specialty,
        date,
        message,
        status: "En attente"
      }).returning();
      res.status(201).json({ success: true, appointment: newAppointment[0] });
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  // Admin routes
  app.get("/api/appointments", requireAuth as express.RequestHandler, async (req, res) => {
    try {
      const allAppointments = await db.select().from(appointments).orderBy(desc(appointments.createdAt));
      res.json(allAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/appointments/:id", requireAuth as express.RequestHandler, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await db.update(appointments)
        .set({ status })
        .where(eq(appointments.id, parseInt(id, 10)))
        .returning();
      res.json({ success: true, appointment: updated[0] });
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "mpa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
