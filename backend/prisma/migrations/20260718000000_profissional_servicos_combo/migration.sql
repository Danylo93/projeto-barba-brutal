-- AlterTable
ALTER TABLE "servico" ADD COLUMN     "ehCombo" BOOLEAN NOT NULL DEFAULT false;

-- Marca serviços já existentes com "combo" no nome como combo,
-- para a regra de seleção exclusiva valer sem edição manual.
UPDATE "servico" SET "ehCombo" = true WHERE lower("nome") LIKE '%combo%';

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
