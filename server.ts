import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db";
import { appointments } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./src/middleware/auth";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // En-têtes de sécurité HTTP
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), microphone=()");
    next();
  });

  app.use(express.json({ limit: "64kb" }));

  // API Healthcheck
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "hopital-regional-thies", timestamp: new Date().toISOString() });
  });

  // Création d'un rendez-vous avec validation stricte
  app.post("/api/appointments", async (req, res) => {
    try {
      const { name, phone, email, specialty, date, message } = req.body || {};
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ success: false, error: "Le nom complet est requis." });
      }
      if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
        return res.status(400).json({ success: false, error: "Un numéro de téléphone valide est requis." });
      }
      if (!specialty || !date) {
        return res.status(400).json({ success: false, error: "La spécialité et la date sont requises." });
      }

      const newAppointment = await db.insert(appointments).values({
        name: name.trim().slice(0, 150),
        phone: phone.trim().slice(0, 30),
        email: email ? String(email).trim().slice(0, 150) : null,
        specialty: String(specialty).trim().slice(0, 100),
        date: String(date).trim().slice(0, 30),
        message: message ? String(message).trim().slice(0, 2000) : null,
        status: "En attente"
      }).returning();

      res.status(201).json({ success: true, appointment: newAppointment[0] });
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  // Routes d'administration protégées par jeton Firebase Admin
  app.get("/api/appointments", requireAuth as express.RequestHandler, async (_req, res) => {
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
      const idNum = parseInt(req.params.id, 10);
      const { status } = req.body || {};
      const allowedStatuses = ["En attente", "Confirmé", "Terminé", "Annulé"];
      if (isNaN(idNum) || !allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: "Paramètres invalides." });
      }
      const updated = await db.update(appointments)
        .set({ status })
        .where(eq(appointments.id, idNum))
        .returning();
      res.json({ success: true, appointment: updated[0] });
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "mpa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use((req, res, next) => {
      if (req.path.endsWith(".cjs") || req.path.endsWith(".cjs.map")) {
        return res.status(404).end();
      }
      next();
    });
    app.use(express.static(distPath, { extensions: ["html"] }));
    app.get("*", (req, res) => {
      const candidate = path.join(distPath, `${req.path.replace(/^\//, "")}.html`);
      if (fs.existsSync(candidate)) {
        return res.sendFile(candidate);
      }
      const notFoundPage = path.join(distPath, "404.html");
      if (fs.existsSync(notFoundPage)) {
        return res.status(404).sendFile(notFoundPage);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
