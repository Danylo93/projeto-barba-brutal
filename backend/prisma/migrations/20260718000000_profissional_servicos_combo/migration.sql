-- AlterTable
ALTER TABLE "servico" ADD COLUMN     "ehCombo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_ProfissionalToServico" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProfissionalToServico_AB_unique" ON "_ProfissionalToServico"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfissionalToServico_B_index" ON "_ProfissionalToServico"("B");

-- AddForeignKey
ALTER TABLE "_ProfissionalToServico" ADD CONSTRAINT "_ProfissionalToServico_A_fkey" FOREIGN KEY ("A") REFERENCES "profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfissionalToServico" ADD CONSTRAINT "_ProfissionalToServico_B_fkey" FOREIGN KEY ("B") REFERENCES "servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
