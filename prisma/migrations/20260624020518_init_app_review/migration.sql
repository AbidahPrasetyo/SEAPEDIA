-- CreateTable
CREATE TABLE "AppReview" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Guest',
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppReview_pkey" PRIMARY KEY ("id")
);
