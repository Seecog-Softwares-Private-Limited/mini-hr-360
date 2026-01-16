-- MySQL dump 10.13  Distrib 8.0.42, for macos15 (x86_64)
--
-- Host: 127.0.0.1    Database: mini_hr_360
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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '9d467318-c2c2-11f0-a514-f5199abbdb16:1-10499,
bbb87c08-d251-11f0-a94d-c87b0ed70aab:1-234';

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
  `address_type` enum('REGISTERED','BRANCH','BILLING','SHIPPING','OTHER') NOT NULL DEFAULT 'REGISTERED',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_business_addresses_business_id` (`business_id`),
  KEY `idx_business_addresses_status` (`status`),
  CONSTRAINT `business_addresses_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_addresses`
--

LOCK TABLES `business_addresses` WRITE;
/*!40000 ALTER TABLE `business_addresses` DISABLE KEYS */;
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
  `businessName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phoneNo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsappNo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `ownerId` int NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Asia/Kolkata',
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ownerId` (`ownerId`),
  CONSTRAINT `businesses_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `businesses`
--

LOCK TABLES `businesses` WRITE;
/*!40000 ALTER TABLE `businesses` DISABLE KEYS */;
INSERT INTO `businesses` VALUES (26,'Demo Company','9876543210',NULL,'Demo company for testing',9,'Technology','Asia/Kolkata','India','2026-01-12 17:20:45','2026-01-12 17:20:45');
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
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessId` int DEFAULT NULL,
  `templateId` int DEFAULT NULL,
  `metaTemplateName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metaTemplateLanguage` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'en_US',
  `metaTemplateCategory` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerIds` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `scheduledAt` datetime DEFAULT NULL,
  `status` enum('draft','scheduled','running','completed','paused') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `recipientCount` int DEFAULT '0',
  `stats` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  KEY `businessId` (`businessId`),
  KEY `templateId` (`templateId`),
  CONSTRAINT `campaigns_ibfk_57` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaigns_ibfk_58` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaigns_ibfk_59` FOREIGN KEY (`templateId`) REFERENCES `templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
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
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_countries_iso_code` (`iso_code`),
  UNIQUE KEY `iso_code` (`iso_code`),
  UNIQUE KEY `iso_code_2` (`iso_code`),
  UNIQUE KEY `iso_code_3` (`iso_code`),
  UNIQUE KEY `iso_code_4` (`iso_code`),
  UNIQUE KEY `iso_code_5` (`iso_code`),
  UNIQUE KEY `iso_code_6` (`iso_code`),
  UNIQUE KEY `iso_code_7` (`iso_code`),
  UNIQUE KEY `iso_code_8` (`iso_code`),
  KEY `idx_countries_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
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
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phoneE164` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` json DEFAULT NULL,
  `consentAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_user_id_phone_e164` (`userId`,`phoneE164`),
  KEY `businessId` (`businessId`),
  CONSTRAINT `customers_ibfk_39` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customers_ibfk_40` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
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
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_business_name` (`businessId`,`name`),
  UNIQUE KEY `uniq_business_code` (`businessId`,`code`),
  KEY `idx_dept_business` (`businessId`),
  KEY `idx_dept_status` (`status`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
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
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_designation_name_per_business` (`businessId`,`name`),
  UNIQUE KEY `uniq_designation_code_per_business` (`businessId`,`code`),
  KEY `idx_desig_business` (`businessId`),
  KEY `idx_desig_status` (`status`),
  KEY `idx_desig_sort` (`sortOrder`),
  CONSTRAINT `designations_ibfk_1` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `designations`
--

LOCK TABLES `designations` WRITE;
/*!40000 ALTER TABLE `designations` DISABLE KEYS */;
/*!40000 ALTER TABLE `designations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_types`
--

DROP TABLE IF EXISTS `document_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `templateHtml` text COLLATE utf8mb4_unicode_ci,
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_document_code` (`code`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `document_types_code` (`code`),
  UNIQUE KEY `code_2` (`code`),
  UNIQUE KEY `code_3` (`code`),
  UNIQUE KEY `code_4` (`code`),
  UNIQUE KEY `code_5` (`code`),
  UNIQUE KEY `code_6` (`code`),
  UNIQUE KEY `code_7` (`code`),
  UNIQUE KEY `code_8` (`code`),
  UNIQUE KEY `code_9` (`code`),
  UNIQUE KEY `code_10` (`code`),
  UNIQUE KEY `code_11` (`code`),
  UNIQUE KEY `code_12` (`code`),
  UNIQUE KEY `code_13` (`code`),
  UNIQUE KEY `code_14` (`code`),
  UNIQUE KEY `code_15` (`code`),
  UNIQUE KEY `code_16` (`code`),
  UNIQUE KEY `code_17` (`code`),
  UNIQUE KEY `code_18` (`code`),
  UNIQUE KEY `code_19` (`code`),
  KEY `document_types_is_deleted` (`isDeleted`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_types`
--

LOCK TABLES `document_types` WRITE;
/*!40000 ALTER TABLE `document_types` DISABLE KEYS */;
INSERT INTO `document_types` VALUES (17,'aa','aa','aa','aa','aa',0,'2026-01-12 19:13:21','2026-01-12 19:13:21',NULL);
/*!40000 ALTER TABLE `document_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) NOT NULL COMMENT 'Unique code like OFFER_LETTER_DEFAULT',
  `template_name` varchar(150) NOT NULL,
  `subject` varchar(255) NOT NULL COMMENT 'Subject with placeholders',
  `body_html` mediumtext NOT NULL COMMENT 'HTML email body with placeholders',
  `document_type_id` int DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_key` (`template_key`),
  UNIQUE KEY `template_key_2` (`template_key`),
  UNIQUE KEY `template_key_3` (`template_key`),
  UNIQUE KEY `template_key_4` (`template_key`),
  UNIQUE KEY `template_key_5` (`template_key`),
  UNIQUE KEY `template_key_6` (`template_key`),
  UNIQUE KEY `template_key_7` (`template_key`),
  UNIQUE KEY `template_key_8` (`template_key`),
  UNIQUE KEY `template_key_9` (`template_key`),
  UNIQUE KEY `template_key_10` (`template_key`),
  UNIQUE KEY `template_key_11` (`template_key`),
  UNIQUE KEY `template_key_12` (`template_key`),
  UNIQUE KEY `template_key_13` (`template_key`),
  UNIQUE KEY `template_key_14` (`template_key`),
  UNIQUE KEY `template_key_15` (`template_key`),
  UNIQUE KEY `template_key_16` (`template_key`),
  UNIQUE KEY `template_key_17` (`template_key`),
  UNIQUE KEY `template_key_18` (`template_key`),
  UNIQUE KEY `template_key_19` (`template_key`),
  KEY `fk_email_templates_document_type` (`document_type_id`),
  CONSTRAINT `email_templates_ibfk_1` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_documents`
--

DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `category` enum('KYC','AADHAAAR','PAN','ADDRESS','EDUCATION','EXPERIENCE','HR','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT 'KYC',
  `documentType` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nameOnDocument` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentNumber` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issueDate` date DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `verificationStatus` enum('Pending','Verified','Rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `verifiedBy` int DEFAULT NULL,
  `verifiedAt` datetime DEFAULT NULL,
  `fileUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentImageUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employee_documents_employee` (`employeeId`),
  KEY `idx_employee_documents_type` (`documentType`),
  KEY `idx_employee_documents_category` (`category`),
  KEY `fk_employee_documents_verified_by` (`verifiedBy`),
  CONSTRAINT `employee_documents_ibfk_1` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_documents_verified_by` FOREIGN KEY (`verifiedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_documents`
--

LOCK TABLES `employee_documents` WRITE;
/*!40000 ALTER TABLE `employee_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_educations`
--

DROP TABLE IF EXISTS `employee_educations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_educations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `degree` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialization` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `institutionName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `board` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startYear` smallint DEFAULT NULL,
  `endYear` smallint DEFAULT NULL,
  `yearOfPassing` smallint DEFAULT NULL,
  `percentageOrCgpa` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modeOfStudy` enum('Full-Time','Part-Time','Distance') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `educationType` enum('School','College','Professional','Technical','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `certificateUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employee_educations_employee` (`employeeId`),
  CONSTRAINT `employee_educations_ibfk_1` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_educations`
--

LOCK TABLES `employee_educations` WRITE;
/*!40000 ALTER TABLE `employee_educations` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_educations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_experiences`
--

DROP TABLE IF EXISTS `employee_experiences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_experiences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `organizationName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jobTitle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employmentType` enum('Full-Time','Part-Time','Contract','Internship','Freelance') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industryType` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyLocationCity` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyLocationCountry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `isCurrent` tinyint(1) DEFAULT '0',
  `durationText` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jobLevel` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastDrawnCtc` decimal(15,2) DEFAULT NULL,
  `reasonForLeaving` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noticePeriodServed` tinyint(1) DEFAULT '0',
  `relievingLetterUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salarySlipsUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bankStatementUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employee_experiences_employee` (`employeeId`),
  CONSTRAINT `employee_experiences_ibfk_1` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_experiences`
--

LOCK TABLES `employee_experiences` WRITE;
/*!40000 ALTER TABLE `employee_experiences` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_experiences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `firstName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middleName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeType` enum('Permanent','Contract','Intern','Consultant','Trainee') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Permanent',
  `empName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('Male','Female','Non-binary','Prefer not to say') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maritalStatus` enum('Single','Married','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bloodGroup` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `religion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `casteCategory` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `languagesKnown` text COLLATE utf8mb4_unicode_ci,
  `empDesignation` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empDepartment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `division` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subDepartment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gradeBandLevel` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reportingManagerId` int DEFAULT NULL,
  `empWorkLoc` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empDateOfJoining` date NOT NULL,
  `probationPeriodMonths` int DEFAULT NULL,
  `confirmationDate` date DEFAULT NULL,
  `employmentStatus` enum('Active','On Leave','Resigned','Terminated','Retired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `workMode` enum('On-site','Hybrid','Remote') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'On-site',
  `empDob` date NOT NULL,
  `empCtc` decimal(15,2) NOT NULL,
  `grossSalaryMonthly` decimal(15,2) DEFAULT NULL,
  `basicSalary` decimal(15,2) DEFAULT NULL,
  `hra` decimal(15,2) DEFAULT NULL,
  `conveyanceAllowance` decimal(15,2) DEFAULT NULL,
  `medicalAllowance` decimal(15,2) DEFAULT NULL,
  `specialAllowance` decimal(15,2) DEFAULT NULL,
  `performanceBonus` decimal(15,2) DEFAULT NULL,
  `variablePay` decimal(15,2) DEFAULT NULL,
  `overtimeEligible` tinyint(1) DEFAULT '0',
  `shiftAllowance` decimal(15,2) DEFAULT NULL,
  `pfDeduction` decimal(15,2) DEFAULT NULL,
  `esiDeduction` decimal(15,2) DEFAULT NULL,
  `professionalTax` decimal(15,2) DEFAULT NULL,
  `tdsDeduction` decimal(15,2) DEFAULT NULL,
  `netSalary` decimal(15,2) DEFAULT NULL,
  `shiftName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shiftCode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shiftStartTime` time DEFAULT NULL,
  `shiftEndTime` time DEFAULT NULL,
  `totalWorkHours` decimal(4,2) DEFAULT NULL,
  `breakDurationMinutes` int DEFAULT NULL,
  `shiftType` enum('Fixed','Rotational','Split','Flexible') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shiftRotationCycle` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gracePeriodMinutes` int DEFAULT NULL,
  `halfDayRuleHours` decimal(4,2) DEFAULT NULL,
  `shiftEffectiveFrom` date DEFAULT NULL,
  `workTimezone` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idProofType` enum('Aadhaar','PAN','Passport','Driving License','Voter ID','National ID','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idProofNumber` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idVerificationStatus` enum('Pending','Verified','Rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `idVerificationDate` date DEFAULT NULL,
  `idVerifiedBy` int DEFAULT NULL,
  `idExpiryDate` date DEFAULT NULL,
  `idCountryOfIssue` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authMethod` enum('Password','SSO','SAML','OAuth','Other') COLLATE utf8mb4_unicode_ci DEFAULT 'Password',
  `mfaEnabled` tinyint(1) DEFAULT '0',
  `accountStatus` enum('Active','Locked','Suspended','Disabled') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `accountCreatedAt` datetime DEFAULT NULL,
  `lastLoginAt` datetime DEFAULT NULL,
  `lastPasswordResetAt` datetime DEFAULT NULL,
  `forcePasswordReset` tinyint(1) DEFAULT '0',
  `allowedLoginIps` text COLLATE utf8mb4_unicode_ci,
  `biometricEnabled` tinyint(1) DEFAULT '0',
  `passwordPolicyStatus` enum('Compliant','Non-compliant') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `systemRole` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exitType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resignationDate` date DEFAULT NULL,
  `exitReason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noticePeriodDays` int DEFAULT NULL,
  `noticeServed` tinyint(1) DEFAULT '0',
  `lastWorkingDay` date DEFAULT NULL,
  `exitStatus` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exitCategory` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empEmail` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empPhone` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `altPhone` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergencyContactName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergencyContactRelation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergencyContactNumber` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presentAddressLine1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presentAddressLine2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presentCity` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presentState` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presentZip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presentCountry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanentSameAsPresent` tinyint(1) DEFAULT '0',
  `permanentAddressLine1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanentAddressLine2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanentCity` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanentState` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanentZip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanentCountry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `internship_start_date` date DEFAULT NULL,
  `internship_end_date` date DEFAULT NULL,
  `internship_offer_date` date DEFAULT NULL,
  `internship_designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Hashed password for employee portal login',
  `role` enum('EMPLOYEE','MANAGER','HR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EMPLOYEE' COMMENT 'Role within employee portal',
  `canLogin` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether employee can login to portal',
  `lastEmployeeLoginAt` datetime DEFAULT NULL,
  `employeeRefreshToken` text COLLATE utf8mb4_unicode_ci,
  `employeeRefreshTokenExpiresAt` datetime DEFAULT NULL,
  `businessId` int DEFAULT NULL COMMENT 'Business this employee belongs to (for multi-tenancy)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `empId` (`empId`),
  UNIQUE KEY `employees_user_id_emp_id` (`userId`,`empId`),
  UNIQUE KEY `employees_user_id_emp_email` (`userId`,`empEmail`),
  UNIQUE KEY `employees_user_id_emp_phone` (`userId`,`empPhone`),
  UNIQUE KEY `empId_2` (`empId`),
  UNIQUE KEY `empId_3` (`empId`),
  UNIQUE KEY `empId_4` (`empId`),
  UNIQUE KEY `empId_5` (`empId`),
  UNIQUE KEY `empId_6` (`empId`),
  UNIQUE KEY `empId_7` (`empId`),
  UNIQUE KEY `empId_8` (`empId`),
  UNIQUE KEY `empId_9` (`empId`),
  UNIQUE KEY `empId_10` (`empId`),
  UNIQUE KEY `empId_11` (`empId`),
  UNIQUE KEY `empId_12` (`empId`),
  UNIQUE KEY `empId_13` (`empId`),
  UNIQUE KEY `empId_14` (`empId`),
  UNIQUE KEY `empId_15` (`empId`),
  UNIQUE KEY `empId_16` (`empId`),
  UNIQUE KEY `empId_17` (`empId`),
  UNIQUE KEY `empId_18` (`empId`),
  UNIQUE KEY `empId_19` (`empId`),
  UNIQUE KEY `empId_20` (`empId`),
  KEY `employees_user_id_is_active` (`userId`,`isActive`),
  KEY `employees_emp_department` (`empDepartment`),
  KEY `employees_emp_designation` (`empDesignation`),
  KEY `businessId` (`businessId`),
  CONSTRAINT `employees_ibfk_19` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `employees_ibfk_20` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (4,9,'John',NULL,'Doe','EMP0001','Permanent','John Doe',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Software Engineer','Engineering',NULL,NULL,NULL,NULL,'Bangalore','2023-01-15',NULL,NULL,'Active','On-site','1995-05-20',1200000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pending',NULL,NULL,NULL,NULL,NULL,NULL,'Password',0,'Active',NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'john.doe@demo.com','9876543211',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-01-12 17:20:45','2026-01-15 07:44:08',NULL,NULL,NULL,NULL,'$2b$10$psQfbORFKjyLxQ/9VKjea.3vIVKe/9nMniLuaNcHYOWMCRoXFJvdW','EMPLOYEE',1,'2026-01-15 07:44:08','453a35aafc78b994fd85bd6291ad717b1f0f33cf752a6735af98e9e46f194067','2026-01-22 07:44:08',26),(5,9,'Jane','Marie','Smith','EMP0002','Permanent','Jane Marie Smith',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Product Manager','Product',NULL,NULL,NULL,NULL,'Mumbai','2022-06-01',NULL,NULL,'Active','On-site','1992-08-15',1800000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pending',NULL,NULL,NULL,NULL,NULL,NULL,'Password',0,'Active',NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'jane.smith@demo.com','9876543212',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-01-12 17:20:45','2026-01-13 13:33:35',NULL,NULL,NULL,NULL,'$2b$10$TTS5gCYeZXGssTCh4nruseWDMbvgPaH5d7IKQu8d.4ypkWCEJ4cz2','EMPLOYEE',1,NULL,NULL,NULL,26),(6,9,'Mike',NULL,'Johnson','EMP0003','Permanent','Mike Johnson',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'HR Manager','Human Resources',NULL,NULL,NULL,NULL,'Delhi','2021-03-10',NULL,NULL,'Active','On-site','1988-12-25',2000000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pending',NULL,NULL,NULL,NULL,NULL,NULL,'Password',0,'Active',NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'mike.johnson@demo.com','9876543213',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-01-12 17:20:45','2026-01-13 13:33:35',NULL,NULL,NULL,NULL,'$2b$10$BitFTkje1zIcwUFQJXzGuu8EX5Ap3rBTcBSaUpJOLH2zD.yO47vs2','HR',1,NULL,NULL,NULL,26);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_approvals`
--

DROP TABLE IF EXISTS `expense_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `expenseRequestId` int NOT NULL,
  `approverId` int NOT NULL COMMENT 'User (admin/HR/Finance) who took the action',
  `action` enum('APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` int NOT NULL DEFAULT '1' COMMENT 'Approval level (for multi-level workflows)',
  `comments` text COLLATE utf8mb4_unicode_ci,
  `actionAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_approvals_business_id` (`businessId`),
  KEY `expense_approvals_expense_request_id` (`expenseRequestId`),
  KEY `expense_approvals_approver_id` (`approverId`),
  CONSTRAINT `expense_approvals_ibfk_7` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `expense_approvals_ibfk_8` FOREIGN KEY (`expenseRequestId`) REFERENCES `expense_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `expense_approvals_ibfk_9` FOREIGN KEY (`approverId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_approvals`
--

LOCK TABLES `expense_approvals` WRITE;
/*!40000 ALTER TABLE `expense_approvals` DISABLE KEYS */;
INSERT INTO `expense_approvals` VALUES (1,26,3,11,'APPROVED',1,'Approved for productivity improvement','2025-12-16 18:30:00','2026-01-13 16:06:16','2026-01-13 16:06:16'),(2,26,4,11,'REJECTED',1,'This is a personal trip, not business related. Please use personal funds.','2025-12-15 18:30:00','2026-01-13 16:06:16','2026-01-13 16:06:16');
/*!40000 ALTER TABLE `expense_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Category name (e.g., Travel, Food, Equipment)',
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Short code for the category',
  `description` text COLLATE utf8mb4_unicode_ci,
  `maxAmountPerRequest` decimal(15,2) DEFAULT NULL COMMENT 'Maximum amount allowed per expense request',
  `maxAmountPerMonth` decimal(15,2) DEFAULT NULL COMMENT 'Maximum amount allowed per employee per month',
  `requiresReceipt` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether receipt upload is mandatory',
  `requiresApproval` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether manager/HR approval is required',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'fa-receipt' COMMENT 'Font Awesome icon class',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#6366f1' COMMENT 'Color code for UI display',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_expense_category_code_per_business` (`businessId`,`code`),
  KEY `expense_categories_business_id` (`businessId`),
  CONSTRAINT `expense_categories_ibfk_1` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
INSERT INTO `expense_categories` VALUES (1,26,'Travel','TRV','Transportation, flights, train tickets, taxi fares',50000.00,100000.00,1,1,1,1,'fa-plane','#3b82f6','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(2,26,'Food & Meals','FOOD','Business meals, client entertainment',5000.00,15000.00,1,1,1,2,'fa-utensils','#22c55e','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(3,26,'Office Supplies','OFFC','Stationery, desk accessories, printer supplies',10000.00,NULL,1,1,1,3,'fa-laptop','#8b5cf6','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(4,26,'Communication','COMM','Mobile recharge, internet, postage',3000.00,NULL,0,1,1,4,'fa-phone','#06b6d4','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(5,26,'Training & Development','TRAIN','Courses, certifications, conference fees',100000.00,NULL,1,1,1,5,'fa-graduation-cap','#f59e0b','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(6,26,'Equipment','EQUIP','Hardware, peripherals, tools',50000.00,NULL,1,1,1,6,'fa-laptop','#ef4444','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(7,26,'Medical','MED','Medical expenses, prescriptions',25000.00,NULL,1,1,1,7,'fa-medkit','#ec4899','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL),(8,26,'Other','OTHER','Miscellaneous expenses',10000.00,NULL,1,1,1,8,'fa-ellipsis-h','#64748b','2026-01-13 16:06:16','2026-01-13 16:07:10',NULL);
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_requests`
--

DROP TABLE IF EXISTS `expense_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `employeeId` int NOT NULL,
  `categoryId` int NOT NULL,
  `expenseDate` date NOT NULL COMMENT 'Date when the expense occurred',
  `amount` decimal(15,2) NOT NULL COMMENT 'Expense amount',
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Description/purpose of the expense',
  `merchantName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Vendor/Merchant name',
  `receiptUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path/URL to uploaded receipt',
  `receiptFileName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Original filename of receipt',
  `status` enum('DRAFT','PENDING','APPROVED','REJECTED','PAID','CANCELED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `submittedAt` datetime DEFAULT NULL COMMENT 'When the request was submitted for approval',
  `approverId` int DEFAULT NULL COMMENT 'User who approved/rejected the request',
  `approvedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `rejectionReason` text COLLATE utf8mb4_unicode_ci,
  `paidAt` datetime DEFAULT NULL COMMENT 'When the reimbursement was paid',
  `paymentReference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment transaction reference',
  `managerNote` text COLLATE utf8mb4_unicode_ci COMMENT 'Note from approver',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_requests_business_id` (`businessId`),
  KEY `expense_requests_employee_id` (`employeeId`),
  KEY `expense_requests_category_id` (`categoryId`),
  KEY `expense_requests_status` (`status`),
  KEY `expense_requests_expense_date` (`expenseDate`),
  KEY `expense_requests_business_id_status` (`businessId`,`status`),
  KEY `expense_requests_employee_id_status` (`employeeId`,`status`),
  KEY `approverId` (`approverId`),
  CONSTRAINT `expense_requests_ibfk_10` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `expense_requests_ibfk_11` FOREIGN KEY (`categoryId`) REFERENCES `expense_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `expense_requests_ibfk_12` FOREIGN KEY (`approverId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `expense_requests_ibfk_9` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_requests`
--

LOCK TABLES `expense_requests` WRITE;
/*!40000 ALTER TABLE `expense_requests` DISABLE KEYS */;
INSERT INTO `expense_requests` VALUES (1,26,4,1,'2026-01-10',15000.00,'INR','Taxi fare for client meeting - Mumbai to Pune round trip','Ola Cabs',NULL,NULL,'PENDING','2026-01-13 16:06:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-13 16:06:16','2026-01-13 16:06:16',NULL),(2,26,4,2,'2026-01-10',2500.00,'INR','Team lunch for project completion celebration','Mainland China Restaurant',NULL,NULL,'PENDING','2026-01-13 16:06:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-13 16:06:16','2026-01-13 16:06:16',NULL),(3,26,5,3,'2025-12-15',8500.00,'INR','Ergonomic keyboard and mouse for WFH setup','Amazon',NULL,NULL,'APPROVED','2025-12-14 18:30:00',11,'2025-12-16 18:30:00',NULL,NULL,NULL,NULL,'Approved for productivity improvement','2026-01-13 16:06:16','2026-01-13 16:06:16',NULL),(4,26,6,1,'2025-12-15',75000.00,'INR','Flight to Bangalore for personal visit','MakeMyTrip',NULL,NULL,'REJECTED','2025-12-14 18:30:00',11,NULL,'2025-12-15 18:30:00','This is a personal trip, not business related. Please use personal funds.',NULL,NULL,NULL,'2026-01-13 16:06:16','2026-01-13 16:06:16',NULL),(5,26,4,4,'2025-11-20',1500.00,'INR','Monthly mobile recharge for business calls','Jio',NULL,NULL,'PAID','2025-11-20 18:30:00',11,'2025-11-21 18:30:00',NULL,NULL,'2025-12-04 18:30:00','PAY-2024-00123',NULL,'2026-01-13 16:06:16','2026-01-13 16:06:16',NULL);
/*!40000 ALTER TABLE `expense_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `planId` int NOT NULL,
  `userPlanId` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `razorpayOrderId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpayPaymentId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpayInvoiceId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('issued','paid','failed','refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'issued',
  `billingCycle` enum('monthly','yearly') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `paidAt` datetime DEFAULT NULL,
  `dueDate` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `planId` (`planId`),
  KEY `invoices_user_id` (`userId`),
  KEY `invoices_razorpay_order_id` (`razorpayOrderId`),
  KEY `invoices_razorpay_payment_id` (`razorpayPaymentId`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_approvals`
--

DROP TABLE IF EXISTS `leave_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `leaveRequestId` int NOT NULL,
  `approverId` int NOT NULL COMMENT 'User (admin/HR) who took the action',
  `action` enum('APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` int NOT NULL DEFAULT '1' COMMENT 'Approval level (for multi-level approval workflows)',
  `comments` text COLLATE utf8mb4_unicode_ci,
  `actionAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_approvals_business_id` (`businessId`),
  KEY `leave_approvals_leave_request_id` (`leaveRequestId`),
  KEY `leave_approvals_approver_id` (`approverId`),
  CONSTRAINT `leave_approvals_ibfk_31` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_approvals_ibfk_32` FOREIGN KEY (`leaveRequestId`) REFERENCES `leave_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_approvals_ibfk_33` FOREIGN KEY (`approverId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_approvals`
--

LOCK TABLES `leave_approvals` WRITE;
/*!40000 ALTER TABLE `leave_approvals` DISABLE KEYS */;
INSERT INTO `leave_approvals` VALUES (1,26,2,9,'APPROVED',1,'Approved','2026-01-04 00:00:00','2026-01-12 17:20:45','2026-01-12 17:20:45'),(2,26,3,9,'REJECTED',1,'Please apply with more notice for earned leaves. Project deadline approaching.','2025-12-22 00:00:00','2026-01-12 17:20:45','2026-01-12 17:20:45'),(3,26,4,9,'APPROVED',1,'Approved','2026-01-12 00:00:00','2026-01-12 17:20:45','2026-01-12 17:20:45'),(4,26,6,9,'APPROVED',1,NULL,'2026-01-12 18:45:36','2026-01-12 18:45:36','2026-01-12 18:45:36'),(5,26,1,9,'APPROVED',1,NULL,'2026-01-12 19:02:29','2026-01-12 19:02:29','2026-01-12 19:02:29'),(6,26,5,9,'REJECTED',1,NULL,'2026-01-12 19:02:42','2026-01-12 19:02:42','2026-01-12 19:02:42'),(7,26,7,9,'APPROVED',1,NULL,'2026-01-13 06:09:19','2026-01-13 06:09:19','2026-01-13 06:09:19'),(8,26,8,9,'REJECTED',1,'Too much frequent leaves is not acceptable by company norms','2026-01-13 06:10:31','2026-01-13 06:10:31','2026-01-13 06:10:31'),(9,26,10,9,'APPROVED',1,'Approved','2026-01-05 00:00:00','2026-01-13 13:28:55','2026-01-13 13:28:55'),(10,26,11,9,'REJECTED',1,'Please apply with more notice for earned leaves. Project deadline approaching.','2025-12-23 00:00:00','2026-01-13 13:28:55','2026-01-13 13:28:55'),(11,26,12,9,'APPROVED',1,'Approved','2026-01-13 00:00:00','2026-01-13 13:28:55','2026-01-13 13:28:55');
/*!40000 ALTER TABLE `leave_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_balances`
--

DROP TABLE IF EXISTS `leave_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_balances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `employeeId` int NOT NULL,
  `leaveTypeId` int NOT NULL,
  `year` int NOT NULL,
  `allocated` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Total leaves allocated for the year',
  `used` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Total leaves used (approved)',
  `pending` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Leaves in pending requests',
  `carriedForward` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Leaves carried from previous year',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_leave_balance_per_year` (`businessId`,`employeeId`,`leaveTypeId`,`year`),
  KEY `leave_balances_business_id` (`businessId`),
  KEY `leave_balances_employee_id` (`employeeId`),
  KEY `leave_balances_leave_type_id` (`leaveTypeId`),
  CONSTRAINT `leave_balances_ibfk_31` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_balances_ibfk_32` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_balances_ibfk_33` FOREIGN KEY (`leaveTypeId`) REFERENCES `leave_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_balances`
--

LOCK TABLES `leave_balances` WRITE;
/*!40000 ALTER TABLE `leave_balances` DISABLE KEYS */;
INSERT INTO `leave_balances` VALUES (1,26,4,2,2026,12.00,5.00,2.00,0.00,'2026-01-12 17:20:45','2026-01-13 13:28:55'),(2,26,4,3,2026,10.00,9.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-13 13:28:55'),(3,26,4,4,2026,15.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(4,26,4,5,2026,24.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(5,26,4,6,2026,0.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(6,26,5,2,2026,12.00,0.00,1.00,0.00,'2026-01-12 17:20:45','2026-01-13 13:28:55'),(7,26,5,3,2026,10.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(8,26,5,4,2026,15.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(9,26,5,5,2026,24.00,2.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-13 13:28:55'),(10,26,5,6,2026,0.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(11,26,6,2,2026,12.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(12,26,6,3,2026,10.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(13,26,6,4,2026,15.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(14,26,6,5,2026,24.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45'),(15,26,6,6,2026,0.00,0.00,0.00,0.00,'2026-01-12 17:20:45','2026-01-12 17:20:45');
/*!40000 ALTER TABLE `leave_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_requests`
--

DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `employeeId` int NOT NULL,
  `leaveTypeId` int NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `totalDays` decimal(5,2) NOT NULL,
  `reason` text,
  `managerNote` text,
  `status` enum('PENDING','APPROVED','REJECTED','CANCELED') NOT NULL DEFAULT 'PENDING',
  `approverId` int DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `rejectedAt` datetime DEFAULT NULL,
  `canceledAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `isHalfDayStart` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'If true, start date is half day',
  `isHalfDayEnd` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'If true, end date is half day',
  `halfDaySession` enum('FIRST_HALF','SECOND_HALF') DEFAULT NULL COMMENT 'For single day half-day leave',
  `attachmentUrl` varchar(500) DEFAULT NULL COMMENT 'URL/path to attached document',
  `attachmentName` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_lr_approver` (`approverId`),
  KEY `idx_lr_business` (`businessId`),
  KEY `idx_lr_employee` (`employeeId`),
  KEY `idx_lr_leavetype` (`leaveTypeId`),
  KEY `idx_lr_status` (`status`),
  KEY `idx_lr_dates` (`startDate`,`endDate`),
  KEY `leave_requests_business_id` (`businessId`),
  KEY `leave_requests_employee_id` (`employeeId`),
  KEY `leave_requests_leave_type_id` (`leaveTypeId`),
  KEY `leave_requests_status` (`status`),
  KEY `leave_requests_start_date_end_date` (`startDate`,`endDate`),
  CONSTRAINT `leave_requests_ibfk_73` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_ibfk_74` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_ibfk_75` FOREIGN KEY (`leaveTypeId`) REFERENCES `leave_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_ibfk_76` FOREIGN KEY (`approverId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_requests`
--

LOCK TABLES `leave_requests` WRITE;
/*!40000 ALTER TABLE `leave_requests` DISABLE KEYS */;
INSERT INTO `leave_requests` VALUES (1,26,4,2,'2026-01-19','2026-01-20',2.00,'Personal work - need to visit bank and complete some paperwork',NULL,'APPROVED',9,'2026-01-12 19:02:29',NULL,NULL,'2026-01-12 17:20:45','2026-01-12 19:02:29',NULL,0,0,NULL,NULL,NULL),(2,26,4,3,'2026-01-02','2026-01-03',2.00,'Not feeling well, need rest',NULL,'APPROVED',9,'2026-01-04 00:00:00',NULL,NULL,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,0,0,NULL,NULL,NULL),(3,26,5,4,'2025-12-23','2025-12-28',6.00,'Vacation trip','Please apply with more notice for earned leaves. Project deadline approaching.','REJECTED',9,NULL,'2025-12-22 00:00:00',NULL,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,0,0,NULL,NULL,NULL),(4,26,5,5,'2026-01-13','2026-01-13',1.00,'Internet installation at new apartment',NULL,'APPROVED',9,'2026-01-12 00:00:00',NULL,NULL,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,0,0,NULL,NULL,NULL),(5,26,5,2,'2026-01-26','2026-01-26',1.00,'Doctor appointment in the morning',NULL,'REJECTED',9,NULL,'2026-01-12 19:02:42',NULL,'2026-01-12 17:20:45','2026-01-12 19:02:42',NULL,1,0,'FIRST_HALF',NULL,NULL),(6,26,4,3,'2026-01-13','2026-01-17',5.00,'something',NULL,'APPROVED',9,'2026-01-12 18:45:36',NULL,NULL,'2026-01-12 17:33:56','2026-01-12 18:45:36',NULL,0,0,NULL,NULL,NULL),(7,26,4,2,'2026-01-22','2026-01-24',3.00,'Going for tour',NULL,'APPROVED',9,'2026-01-13 06:09:19',NULL,NULL,'2026-01-13 06:08:42','2026-01-13 06:09:19',NULL,0,0,NULL,NULL,NULL),(8,26,4,2,'2026-01-28','2026-01-30',3.00,'Going for shopping','Too much frequent leaves is not acceptable by company norms','REJECTED',9,NULL,'2026-01-13 06:10:31',NULL,'2026-01-13 06:09:57','2026-01-13 06:10:31',NULL,0,0,NULL,NULL,NULL),(9,26,4,2,'2026-01-20','2026-01-21',2.00,'Personal work - need to visit bank and complete some paperwork',NULL,'PENDING',NULL,NULL,NULL,NULL,'2026-01-13 13:28:55','2026-01-13 13:28:55',NULL,0,0,NULL,NULL,NULL),(10,26,4,3,'2026-01-03','2026-01-04',2.00,'Not feeling well, need rest',NULL,'APPROVED',9,'2026-01-05 00:00:00',NULL,NULL,'2026-01-13 13:28:55','2026-01-13 13:28:55',NULL,0,0,NULL,NULL,NULL),(11,26,5,4,'2025-12-24','2025-12-29',6.00,'Vacation trip','Please apply with more notice for earned leaves. Project deadline approaching.','REJECTED',9,NULL,'2025-12-23 00:00:00',NULL,'2026-01-13 13:28:55','2026-01-13 13:28:55',NULL,0,0,NULL,NULL,NULL),(12,26,5,5,'2026-01-14','2026-01-14',1.00,'Internet installation at new apartment',NULL,'APPROVED',9,'2026-01-13 00:00:00',NULL,NULL,'2026-01-13 13:28:55','2026-01-13 13:28:55',NULL,0,0,NULL,NULL,NULL),(13,26,5,2,'2026-01-27','2026-01-27',1.00,'Doctor appointment in the morning',NULL,'PENDING',NULL,NULL,NULL,NULL,'2026-01-13 13:28:55','2026-01-13 13:28:55',NULL,1,0,'FIRST_HALF',NULL,NULL);
/*!40000 ALTER TABLE `leave_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_types`
--

DROP TABLE IF EXISTS `leave_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `code` varchar(32) DEFAULT NULL,
  `description` text,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `sortOrder` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `isPaid` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this leave type is paid',
  `allowHalfDay` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether half-day leave is allowed',
  `maxPerYear` decimal(5,2) DEFAULT NULL COMMENT 'Maximum leaves allowed per year (null = unlimited)',
  `allowCarryForward` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether unused leaves can be carried forward',
  `maxCarryForward` decimal(5,2) DEFAULT NULL COMMENT 'Maximum leaves that can be carried forward',
  `requiresAttachment` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether attachment is required for this leave type',
  `minDaysNotice` int DEFAULT '0' COMMENT 'Minimum days notice required for applying',
  `color` varchar(20) DEFAULT '#6366f1' COMMENT 'Color code for UI display',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_leavetype_name_per_business` (`businessId`,`name`),
  UNIQUE KEY `uniq_leavetype_code_per_business` (`businessId`,`code`),
  KEY `idx_lt_business` (`businessId`),
  KEY `idx_lt_status` (`status`),
  KEY `idx_lt_sort` (`sortOrder`),
  CONSTRAINT `leave_types_ibfk_1` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_types`
--

LOCK TABLES `leave_types` WRITE;
/*!40000 ALTER TABLE `leave_types` DISABLE KEYS */;
INSERT INTO `leave_types` VALUES (2,26,'Casual Leave','CL','For personal work and casual requirements','ACTIVE',1,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,1,1,12.00,0,NULL,0,1,'#3b82f6'),(3,26,'Sick Leave','SL','For health-related issues and medical appointments','ACTIVE',2,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,1,1,10.00,0,NULL,0,0,'#ef4444'),(4,26,'Earned Leave','EL','Earned/Privilege leave that can be carried forward','ACTIVE',3,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,1,0,15.00,1,10.00,0,7,'#22c55e'),(5,26,'Work From Home','WFH','Work from home days','ACTIVE',4,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,1,1,24.00,0,NULL,0,1,'#8b5cf6'),(6,26,'Unpaid Leave','UL','Leave without pay','ACTIVE',5,'2026-01-12 17:20:45','2026-01-12 17:20:45',NULL,0,0,NULL,0,NULL,0,3,'#64748b');
/*!40000 ALTER TABLE `leave_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_logs`
--

DROP TABLE IF EXISTS `message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `customerId` int NOT NULL,
  `to` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waMessageId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('queued','sent','delivered','read','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `error` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `templateId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `message_logs_campaign_id_customer_id` (`campaignId`,`customerId`),
  KEY `customerId` (`customerId`),
  KEY `templateId` (`templateId`),
  CONSTRAINT `message_logs_ibfk_58` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `message_logs_ibfk_59` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `message_logs_ibfk_60` FOREIGN KEY (`templateId`) REFERENCES `templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_logs`
--

LOCK TABLES `message_logs` WRITE;
/*!40000 ALTER TABLE `message_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_logs`
--

DROP TABLE IF EXISTS `payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `planId` int NOT NULL,
  `razorpayOrderId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpayPaymentId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `billingCycle` enum('monthly','yearly') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `status` enum('pending','completed','failed','refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `errorMessage` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `paidAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `razorpayOrderId` (`razorpayOrderId`),
  KEY `payment_logs_user_id` (`userId`),
  KEY `payment_logs_razorpay_order_id` (`razorpayOrderId`),
  KEY `payment_logs_status` (`status`),
  CONSTRAINT `payment_logs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_logs`
--

LOCK TABLES `payment_logs` WRITE;
/*!40000 ALTER TABLE `payment_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `yearlyPrice` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `billingPeriod` enum('monthly','yearly','lifetime','free') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `maxCustomers` int DEFAULT '50',
  `maxBusinesses` int DEFAULT '1',
  `maxEmailsPerMonth` int DEFAULT '100',
  `maxWhatsAppMessagesPerMonth` int DEFAULT '0',
  `hasEmailTemplates` tinyint(1) NOT NULL DEFAULT '1',
  `hasWhatsAppTemplates` tinyint(1) NOT NULL DEFAULT '0',
  `hasInvoice` tinyint(1) NOT NULL DEFAULT '0',
  `hasAnalytics` tinyint(1) NOT NULL DEFAULT '0',
  `hasApiAccess` tinyint(1) NOT NULL DEFAULT '0',
  `hasCustomIntegrations` tinyint(1) NOT NULL DEFAULT '0',
  `hasPrioritySupport` tinyint(1) NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `displayOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plans_name` (`name`),
  UNIQUE KEY `uq_plans_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `razorpay_plan_mappings`
--

DROP TABLE IF EXISTS `razorpay_plan_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `razorpay_plan_mappings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `planId` int NOT NULL,
  `razorpayPlanId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `planId` (`planId`),
  CONSTRAINT `razorpay_plan_mappings_ibfk_1` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `razorpay_plan_mappings`
--

LOCK TABLES `razorpay_plan_mappings` WRITE;
/*!40000 ALTER TABLE `razorpay_plan_mappings` DISABLE KEYS */;
/*!40000 ALTER TABLE `razorpay_plan_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `code` varchar(32) DEFAULT NULL,
  `description` text,
  `basePrice` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `durationMinutes` int DEFAULT NULL,
  `taxRate` decimal(5,2) DEFAULT NULL,
  `isTaxInclusive` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `visible` tinyint(1) NOT NULL DEFAULT '1',
  `sortOrder` int DEFAULT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_service_name_per_business` (`businessId`,`name`),
  UNIQUE KEY `uniq_service_code_per_business` (`businessId`,`code`),
  KEY `idx_service_business` (`businessId`),
  KEY `idx_service_status` (`status`),
  KEY `idx_service_visible` (`visible`),
  KEY `idx_service_sort` (`sortOrder`),
  CONSTRAINT `services_ibfk_1` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `states`
--

DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `states` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(10) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_states_country_id` (`country_id`),
  CONSTRAINT `states_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `states`
--

LOCK TABLES `states` WRITE;
/*!40000 ALTER TABLE `states` DISABLE KEYS */;
/*!40000 ALTER TABLE `states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `planId` int NOT NULL,
  `razorpaySubscriptionId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','active','past_due','cancelled','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `totalCount` int DEFAULT '12',
  `billedCount` int DEFAULT '0',
  `currentCycleStart` datetime DEFAULT NULL,
  `currentCycleEnd` datetime DEFAULT NULL,
  `cancelAtPeriodEnd` tinyint(1) NOT NULL DEFAULT '0',
  `cancelledAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `razorpaySubscriptionId` (`razorpaySubscriptionId`),
  KEY `planId` (`planId`),
  KEY `subscriptions_user_id` (`userId`),
  KEY `subscriptions_razorpay_subscription_id` (`razorpaySubscriptionId`),
  KEY `subscriptions_status` (`status`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `waName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'en_US',
  `category` enum('marketing','utility','authentication') COLLATE utf8mb4_unicode_ci NOT NULL,
  `components` json DEFAULT NULL,
  `displayName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `htmlContent` text COLLATE utf8mb4_unicode_ci COMMENT 'Rich HTML content for the template',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `templates_user_id_wa_name` (`userId`,`waName`),
  CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `templates`
--

LOCK TABLES `templates` WRITE;
/*!40000 ALTER TABLE `templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_plans`
--

DROP TABLE IF EXISTS `user_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `planId` int NOT NULL,
  `status` enum('active','expired','cancelled','trial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trial',
  `startDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `endDate` datetime DEFAULT NULL,
  `isCurrent` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_plans_userId` (`userId`),
  KEY `idx_user_plans_planId` (`planId`),
  KEY `idx_user_plans_userId_isCurrent` (`userId`,`isCurrent`),
  CONSTRAINT `user_plans_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_plans_ibfk_2` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_plans`
--

LOCK TABLES `user_plans` WRITE;
/*!40000 ALTER TABLE `user_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `avatarUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `firstName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phoneNo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('SUPER_ADMIN','TENANT_ADMIN','HR_MANAGER','HR_EXECUTIVE','FINANCE','MANAGER','EMPLOYEE') COLLATE utf8mb4_unicode_ci DEFAULT 'EMPLOYEE',
  `status` enum('active','invited','disabled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `refreshTokens` text COLLATE utf8mb4_unicode_ci,
  `refreshTokenExpiresAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `defaultBusinessId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  KEY `defaultBusinessId` (`defaultBusinessId`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`defaultBusinessId`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (9,NULL,'Admin','User',NULL,'admin@demo.com','$2b$10$5dM8mZFUzh70TckEsqcb4.cEm1odpoGP2NNPFIcM8BqFQB./6J.vC','SUPER_ADMIN','active','5919e284025bbedf575e3737e527c16cd3a1db4a42e1384921f93c85d5ec9a77','2026-01-20 13:39:00','2026-01-12 17:20:44','2026-01-13 13:39:00',26),(10,NULL,'Super','Admin',NULL,'super@seecog.com','$2b$10$hGxphFZAjJPOaUunQ.oSOOTTA2ewJzd9oustvVMQwv64IX6Ut4oqi','SUPER_ADMIN','active','566b2569e1a06cc94dc3123a0966604109c3b019356bf8279fc0c298903538f6','2026-01-20 13:30:29','2026-01-13 13:28:54','2026-01-13 13:30:29',NULL),(11,NULL,'HR','Manager',NULL,'hr@demo.com','$2b$10$ixdWLsuZyMOqgVTWRP.fQu7oBSIPiMoKr6xrEqHYpGpz6SgZNwd02','HR_MANAGER','active','e853c23ea106cfe83901684f08a4140b478ab8eeea755e63d2bf381b56845bf1','2026-01-22 07:37:22','2026-01-13 13:28:54','2026-01-15 07:37:22',26),(12,NULL,'HR','Executive',NULL,'hrexec@demo.com','$2b$10$jJbjou3xVYGweRJ2IwjUeeSdBXgofThhf8gELRNENmk4Q4KNWAF22','HR_EXECUTIVE','active',NULL,NULL,'2026-01-13 13:28:54','2026-01-13 13:28:54',26),(13,NULL,'Finance','User',NULL,'finance@demo.com','$2b$10$kpRiW3xY5PX.oEqrLSGJOO5CeUsaTteVO96V0HE9Fv.6Wi4NeRnZm','FINANCE','active','a8b65ed28a13beac73e21b3a022fbf1c2a0a56ab49e36863eecf96a09120e95e','2026-01-20 13:41:49','2026-01-13 13:28:54','2026-01-13 13:41:49',26),(14,NULL,'Team','Manager',NULL,'manager@demo.com','$2b$10$gsnIEOVmOyeHwlOucTvzU.ooN1PJWzCSFl/CM/rsTwgEi24.YWx3y','MANAGER','active',NULL,NULL,'2026-01-13 13:28:54','2026-01-13 13:28:54',26),(15,NULL,'John','Employee',NULL,'employee@demo.com','$2b$10$rs2P3ZytMSrL9guWDkly.uPRpvQ68QTzv874SspXPpuX8iS7UI6uq','EMPLOYEE','active',NULL,NULL,'2026-01-13 13:28:54','2026-01-13 13:28:54',26);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook_logs`
--

DROP TABLE IF EXISTS `webhook_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eventId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventType` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL,
  `processed` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `eventId` (`eventId`),
  KEY `webhook_logs_event_id` (`eventId`),
  KEY `webhook_logs_event_type` (`eventType`),
  KEY `webhook_logs_processed` (`processed`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_logs`
--

LOCK TABLES `webhook_logs` WRITE;
/*!40000 ALTER TABLE `webhook_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook_logs` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-15 13:30:54
