use mini_hr_360;

-- MySQL dump 10.13  Distrib 8.0.44, for macos15 (arm64)
--
-- Host: localhost    Database: mini_hr_360
-- ------------------------------------------------------
-- Server version	9.5.0

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





--
-- Table structure for table `business_addresses`
--



DROP TABLE IF EXISTS `business_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_addresses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `address_name` varchar(150) NOT NULL,
  `full_address` text NOT NULL,
  `address_type` enum('REGISTERED','BRANCH','BILLING','SHIPPING','OTHER') DEFAULT 'REGISTERED',
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_business_addresses_business_id` (`business_id`),
  KEY `idx_business_addresses_status` (`status`),
  CONSTRAINT `fk_business_addresses_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `business_addresses`
--



LOCK TABLES `business_addresses` WRITE;
/*!40000 ALTER TABLE `business_addresses` DISABLE KEYS */;
INSERT INTO `business_addresses` VALUES (2,3,'Bengaluru Head Office','3rd Floor, ABC Tech Park, Outer Ring Road, Marathahalli, Bengaluru, Karnataka, 560037, India','REGISTERED','ACTIVE','2025-11-23 14:06:48','2025-11-23 14:06:48');
/*!40000 ALTER TABLE `business_addresses` ENABLE KEYS */;
UNLOCK TABLES;



--
-- Table structure for table `businesses`
--



DROP TABLE IF EXISTS `businesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `businesses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phoneNo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsappNo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ownerId` int NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Asia/Kolkata',
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ownerId` (`ownerId`),
  KEY `userId` (`userId`),
  CONSTRAINT `businesses_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`),
  CONSTRAINT `businesses_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `businesses`
--



LOCK TABLES `businesses` WRITE;
/*!40000 ALTER TABLE `businesses` DISABLE KEYS */;
INSERT INTO `businesses` VALUES (3,'Pet Service','+919064784636','+919064784636','Pet Services in the home',1,'healthcare','Asia/Kolkata','IN','2025-10-12 07:10:31','2025-10-12 07:10:31',NULL),(18,'Home Service','+918974675563','+918765456789','Stella Home Services',1,'other','Asia/Kolkata','IN','2025-10-12 17:29:50','2025-10-12 17:29:50',NULL),(19,'Pet service','+916784637647','+917846376478','Grooming',3,'healthcare','Asia/Kolkata','IN','2025-10-15 08:15:58','2025-10-15 08:15:58',NULL),(20,'pavan','+919346032495','+919346032495','',7,'restaurant','Asia/Kolkata','IN','2025-12-20 11:07:02','2025-12-20 11:07:02',NULL),(23,'apple','+919505332704','+919505332704','',7,'technology','Asia/Kolkata','IN','2025-12-22 11:33:04','2025-12-22 11:33:04',NULL),(24,'Seecog softwares private limited','+917857467895','+917857465789','',6,'technology','Asia/Kolkata','IN','2025-12-24 06:51:53','2025-12-24 06:51:53',NULL);
/*!40000 ALTER TABLE `businesses` ENABLE KEYS */;
UNLOCK TABLES;



--
-- Table structure for table `campaigns`
--



DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessId` int DEFAULT NULL,
  `templateId` int DEFAULT NULL,
  `metaTemplateName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metaTemplateLanguage` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en_US',
  `metaTemplateCategory` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerIds` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JSON string of customer IDs',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `scheduledAt` datetime DEFAULT NULL,
  `status` enum('draft','scheduled','running','completed','paused','failed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `recipientCount` int NOT NULL DEFAULT '0',
  `filters` json DEFAULT NULL,
  `stats` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `businessId` (`businessId`),
  KEY `templateId` (`templateId`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaigns_ibfk_2` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `campaigns`
--



LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
INSERT INTO `campaigns` VALUES (3,3,'Test',19,NULL,'puja_offer1','en_US','marketing','[3]',NULL,'2025-10-15 08:17:24','completed',1,NULL,'{\"read\": 0, \"sent\": 0, \"total\": 1, \"failed\": 1, \"delivered\": 0}','2025-10-15 08:17:24','2025-10-15 08:18:30'),(5,1,'Testing',3,NULL,'diwali_pet_grooming','en_US','marketing','[4,2,1]','Grooming','2025-10-15 10:55:39','completed',3,NULL,'{\"read\": 0, \"sent\": 3, \"total\": 3, \"failed\": 0, \"delivered\": 0}','2025-10-15 10:55:39','2025-11-16 09:37:51');
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;



--
-- Table structure for table `countries`
--



DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `iso_code` varchar(3) NOT NULL,
  `phone_code` varchar(10) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_countries_iso_code` (`iso_code`),
  KEY `idx_countries_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `countries`
--



LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
INSERT INTO `countries` VALUES (1,'India','IN','+91','ACTIVE','2025-11-23 11:17:09','2025-11-23 11:17:09');
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;



--
-- Table structure for table `customers`
--



DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `businessId` int DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phoneE164` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `whatsappE164` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `consentAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_user_id_phone_e164` (`userId`,`phoneE164`),
  KEY `businessId` (`businessId`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `customers`
--



LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,1,3,'Mukesh Kumhar',NULL,'+919064784636',NULL,'[\"vip\"]','2025-10-12 07:57:50','2025-10-12 07:39:56','2025-10-12 07:57:50'),(2,1,3,'Pankaj Agarwal',NULL,'+917348820668',NULL,'[\"regular\"]','2025-10-12 10:16:52','2025-10-12 10:16:52','2025-10-12 10:16:52'),(3,3,19,'Mukesh kumar',NULL,'+919064784636',NULL,'[\"vip\"]','2025-10-15 08:16:22','2025-10-15 08:16:22','2025-10-15 08:16:22'),(4,1,3,'Sonam Agarwal',NULL,'+916206992612',NULL,'[\"vip\"]','2025-10-15 10:54:21','2025-10-15 10:54:21','2025-10-15 10:54:21'),(7,7,20,'pavan','pavan234@gmail.com','+919346032495','+93460324945','[\"vip\"]','2025-12-22 11:32:16','2025-12-22 11:32:16','2025-12-22 13:39:56');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;



--
-- Table structure for table `departments`
--



DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `businessId` int NOT NULL,
  `name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','INACTIVE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_business_name` (`businessId`,`name`),
  UNIQUE KEY `uniq_business_code` (`businessId`,`code`),
  KEY `idx_dept_business` (`businessId`),
  KEY `idx_dept_status` (`status`),
  CONSTRAINT `fk_dept_business` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `departments`
--



LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES ('1',3,'Engineering','ENGINEERING','Software development','ACTIVE','{}','2025-10-21 16:02:18','2025-11-19 11:29:13',NULL),('2',3,'Corporate Sales','SALES','Revenue team','INACTIVE','{\"notes\": \"seasonal\", \"office\": \"B2\"}','2025-10-21 15:50:28','2025-11-19 11:29:53','2025-10-21 16:13:17'),('fcea87f0-a1f5-494d-9978-7dcf1ab83a6b',3,'Finance','finance','All Financeal Transation','ACTIVE','{}','2025-11-23 07:08:34','2025-11-23 07:08:34',NULL);
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;



--
-- Table structure for table `designations`
--



DROP TABLE IF EXISTS `designations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `designations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `code` varchar(32) DEFAULT NULL,
  `description` text,
  `metaData` json DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `sortOrder` int DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_designation_name_per_business` (`businessId`,`name`),
  UNIQUE KEY `uniq_designation_code_per_business` (`businessId`,`code`),
  KEY `idx_desig_business` (`businessId`),
  KEY `idx_desig_status` (`status`),
  KEY `idx_desig_sort` (`sortOrder`),
  CONSTRAINT `fk_designation_business` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Dumping data for table `designations`
--



LOCK TABLES `designations` WRITE;
/*!40000 ALTER TABLE `designations` DISABLE KEYS */;
INSERT INTO `designations` VALUES (1,3,'Lead Developer','SR_DEV','Leads modules',NULL,'ACTIVE',5,'2025-10-22 09:39:17','2025-10-22 09:44:51',NULL);
/*!40000 ALTER TABLE `designations` ENABLE KEYS */;
UNLOCK TABLES;



