import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../auth.js";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/barcode/:code", authMiddleware, async (req, res) => {
  try {
    const produto = await prisma.product.findFirst({
      where: {
        barcode: req.params.code,
        accountId: req.user.accountId
      },
      include: { inventory: true }
    });

    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    res.json(produto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, barcode } = req.body;
    const p = await prisma.product.create({
      data: {
        name,
        barcode,
        accountId: req.user.accountId
      }
    });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

export default router;
