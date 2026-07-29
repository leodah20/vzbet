/*
  Warnings:

  - Added the required column `predictedOutcome` to the `Prediction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PredictedOutcome" AS ENUM ('CASA', 'EMPATE', 'FORA');

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "predictedOutcome" "PredictedOutcome" NOT NULL,
ALTER COLUMN "predictedHome" DROP NOT NULL,
ALTER COLUMN "predictedAway" DROP NOT NULL;
