-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "wooBaseUrl" TEXT,
    "dna" TEXT NOT NULL DEFAULT '{}',
    "goldExamples" TEXT NOT NULL DEFAULT '[]',
    "metaPageId" TEXT,
    "igUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "briefPrompt" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "uploadedAssets" TEXT,
    "seedContentId" TEXT,
    "copy" TEXT NOT NULL DEFAULT '{}',
    "assets" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" DATETIME,
    "postedAt" DATETIME,
    "metaResult" TEXT,
    "revisions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Content_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT,
    "platform" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MetaToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MetaToken_brandId_key" ON "MetaToken"("brandId");
