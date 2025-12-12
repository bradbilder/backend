import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/adjust", authMiddleware, async (req, res) => {
  const { productId, delta } = req.body;
  if (typeof productId === "undefined" || typeof delta === "undefined") {
    return res.status(400).json({ error: "productId e delta são obrigatórios" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.upsert({
        where: { productId },
        create: { productId, quantity: delta },
        update: { quantity: { increment: delta } }
      });

      await tx.stockTransaction.create({
        data: {
          productId,
          accountId: req.user.accountId,
          userId: req.user.id,
          delta
        }
      });

      return inv;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao ajustar estoque" });
  }
});

export default router;
