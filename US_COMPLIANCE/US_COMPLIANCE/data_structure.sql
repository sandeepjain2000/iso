-- MySQL dump 10.13  Distrib 8.4.9, for Linux (x86_64)
--
-- Host: localhost    Database: us-complaince
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '3432b5fc-0658-11f1-b24e-a628a922a7cb:1-3235';

--
-- Table structure for table `iso_asset`
--

DROP TABLE IF EXISTS `iso_asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_asset` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_number` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_type_id` int NOT NULL,
  `asset_subtype_id` int DEFAULT NULL,
  `asset_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `owner` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdBy` int NOT NULL,
  `updatedBy` int NOT NULL,
  `custodianEmail` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_classification` enum('PUBLIC','CONFIDENTIAL','HIGHLY_CONFIDENTIAL','INTERNAL_USE_ONLY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_risk_level` enum('LOW','MEDIUM','HIGH','VERY_HIGH') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_associated_risks` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `vulnerabilities` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `asset_cost` int NOT NULL,
  `asset_criticality` enum('LOW','MEDIUM','HIGH','VERY_HIGH') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `iso_clause_ref` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `controls` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `maintenance_schedule` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_condition` enum('NEW','GOOD','FAIR','POOR','OBSOLETE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `acquired_date` datetime(3) NOT NULL,
  `disposal_date` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_asset_asset_id_key` (`asset_id`),
  KEY `iso_asset_asset_type_id_fkey` (`asset_type_id`),
  KEY `iso_asset_asset_subtype_id_fkey` (`asset_subtype_id`),
  KEY `iso_asset__custodian_fkey` (`custodianEmail`),
  KEY `iso_asset__creator_fkey` (`createdBy`),
  KEY `iso_asset__updater_fkey` (`updatedBy`),
  CONSTRAINT `iso_asset__creator_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `iso_asset__custodian_fkey` FOREIGN KEY (`custodianEmail`) REFERENCES `user` (`email`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `iso_asset__updater_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `iso_asset_asset_subtype_id_fkey` FOREIGN KEY (`asset_subtype_id`) REFERENCES `iso_asset_subtype` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `iso_asset_asset_type_id_fkey` FOREIGN KEY (`asset_type_id`) REFERENCES `iso_asset_type` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_asset_subtype`
--

DROP TABLE IF EXISTS `iso_asset_subtype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_asset_subtype` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_type_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_asset_subtype_name_key` (`name`),
  KEY `iso_asset_subtype_asset_type_id_fkey` (`asset_type_id`),
  CONSTRAINT `iso_asset_subtype_asset_type_id_fkey` FOREIGN KEY (`asset_type_id`) REFERENCES `iso_asset_type` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_asset_type`
--

DROP TABLE IF EXISTS `iso_asset_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_asset_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_asset_type_asset_type_key` (`asset_type`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_category`
--

DROP TABLE IF EXISTS `iso_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `include` tinyint(1) NOT NULL DEFAULT '1',
  `documentId` int NOT NULL,
  `createdBy` int NOT NULL,
  `updatedBy` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_category_name_documentId_key` (`name`,`documentId`),
  KEY `fk_category_document` (`documentId`),
  KEY `fk_category_createdBy` (`createdBy`),
  KEY `fk_category_updatedBy` (`updatedBy`),
  CONSTRAINT `fk_category_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_category_document` FOREIGN KEY (`documentId`) REFERENCES `iso_document` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_category_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=318 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_document`
--

DROP TABLE IF EXISTS `iso_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_document` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `include` tinyint(1) NOT NULL DEFAULT '1',
  `createdBy` int NOT NULL,
  `updatedBy` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_document_name_key` (`name`),
  KEY `fk_document_createdBy` (`createdBy`),
  KEY `fk_document_updatedBy` (`updatedBy`),
  CONSTRAINT `fk_document_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_document_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_evidence`
--

DROP TABLE IF EXISTS `iso_evidence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `include` tinyint(1) NOT NULL DEFAULT '1',
  `level_2_ID` int NOT NULL,
  `createdBy` int NOT NULL,
  `updatedBy` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_evidence_level2` (`level_2_ID`),
  KEY `fk_evidence_createdBy` (`createdBy`),
  KEY `fk_evidence_updatedBy` (`updatedBy`),
  CONSTRAINT `fk_evidence_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_level2` FOREIGN KEY (`level_2_ID`) REFERENCES `iso_level_2` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_level_1`
--

DROP TABLE IF EXISTS `iso_level_1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_level_1` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `include` tinyint(1) NOT NULL DEFAULT '1',
  `categoryId` int NOT NULL,
  `inherent_likelihood` enum('RARE','UNLIKELY','POSSIBLE','LIKELY','ALMOST_CERTAIN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `residual_likelihood` enum('RARE','UNLIKELY','POSSIBLE','LIKELY','ALMOST_CERTAIN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inherent_impact` enum('INSIGNIFICANT','MINOR','MODERATE','MAJOR','CATASTROPHIC') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `residual_impact` enum('INSIGNIFICANT','MINOR','MODERATE','MAJOR','CATASTROPHIC') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdBy` int NOT NULL,
  `updatedBy` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_level_1_name_categoryId_key` (`name`,`categoryId`),
  KEY `fk_level1_category` (`categoryId`),
  KEY `fk_level1_createdBy` (`createdBy`),
  KEY `fk_level1_updatedBy` (`updatedBy`),
  CONSTRAINT `fk_level1_category` FOREIGN KEY (`categoryId`) REFERENCES `iso_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_level1_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_level1_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1260 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iso_level_2`
--

DROP TABLE IF EXISTS `iso_level_2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `iso_level_2` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `include` tinyint(1) NOT NULL DEFAULT '1',
  `level_1_ID` int NOT NULL,
  `createdBy` int NOT NULL,
  `updatedBy` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso_level_2_name_level_1_ID_key` (`name`,`level_1_ID`),
  KEY `fk_level2_level1` (`level_1_ID`),
  KEY `fk_level2_createdBy` (`createdBy`),
  KEY `fk_level2_updatedBy` (`updatedBy`),
  CONSTRAINT `fk_level2_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_level2_level1` FOREIGN KEY (`level_1_ID`) REFERENCES `iso_level_1` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_level2_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3217 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','USER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `createdBy` int DEFAULT NULL,
  `updatedBy` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_key` (`email`),
  KEY `fk_user_createdBy` (`createdBy`),
  KEY `fk_user_updatedBy` (`updatedBy`),
  CONSTRAINT `fk_user_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-04 15:55:52
