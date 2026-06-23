BEGIN TRANSACTION;
CREATE TABLE attendance_records (
	id INTEGER NOT NULL, 
	participant_name VARCHAR(255) NOT NULL, 
	meeting_id VARCHAR(255) NOT NULL, 
	first_seen DATETIME NOT NULL, 
	last_seen DATETIME NOT NULL, 
	total_seconds INTEGER NOT NULL, 
	status VARCHAR(32) NOT NULL, meeting_session_id INTEGER, 
	PRIMARY KEY (id)
);
INSERT INTO "attendance_records" VALUES(1,'Huulity','89293747800','2026-06-04 12:24:03.769217','2026-06-04 12:29:29.082240',325,'left',NULL);
INSERT INTO "attendance_records" VALUES(2,'(Host, me)','89293747800','2026-06-04 12:24:03.769217','2026-06-04 12:26:39.086880',155,'left',NULL);
INSERT INTO "attendance_records" VALUES(3,'dsdsfsf','89293747800','2026-06-04 12:24:03.769217','2026-06-04 12:29:29.082240',325,'left',NULL);
INSERT INTO "attendance_records" VALUES(4,'(Guest)','89293747800','2026-06-04 12:24:03.769217','2026-06-04 12:26:39.086880',155,'left',NULL);
INSERT INTO "attendance_records" VALUES(5,'Mute All','89293747800','2026-06-04 12:24:03.769217','2026-06-04 12:26:39.086880',155,'left',NULL);
INSERT INTO "attendance_records" VALUES(6,'sssssssssssssss','3780800730','2026-06-12 12:35:37.711983','2026-06-12 12:35:57.677928',19,'left',1);
INSERT INTO "attendance_records" VALUES(7,'Олена Вікторівна Головачова','3780800730','2026-06-12 12:35:52.681732','2026-06-12 12:35:57.677928',4,'left',1);
INSERT INTO "attendance_records" VALUES(8,'NS','3780800730','2026-06-12 12:35:52.681732','2026-06-12 12:35:57.677928',4,'left',1);
INSERT INTO "attendance_records" VALUES(9,'Nepeitsev Sviatoslav РЗ-252','3780800730','2026-06-12 12:35:52.681732','2026-06-12 12:35:57.677928',4,'left',1);
INSERT INTO "attendance_records" VALUES(10,'Teacher','78505992359','2026-06-20 10:49:23.430378','2026-06-20 10:58:13.638350',530,'left',4);
INSERT INTO "attendance_records" VALUES(28,'Search','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(29,'Home','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(30,'Notifications4','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(31,'All files','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(32,'My files','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(33,'Shared folders','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(34,'All meeting assets','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(35,'Recordings','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(36,'Summaries','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(37,'My NotesNew','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(38,'Templates','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(39,'Trash','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(40,'Settings','wc_home','2026-06-20 10:52:31.218087','2026-06-20 11:43:37.756023',3066,'left',3);
INSERT INTO "attendance_records" VALUES(44,'Notifications','wc_home','2026-06-20 10:52:47.867289','2026-06-20 11:43:32.859311',3044,'left',3);
INSERT INTO "attendance_records" VALUES(71,'Teacher','73147809418','2026-06-20 12:15:10.665434','2026-06-20 12:19:11.891076',241,'left',8);
INSERT INTO "attendance_records" VALUES(92,'Search','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(93,'Home','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(94,'Notifications','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:17:30.856201',4,'left',10);
INSERT INTO "attendance_records" VALUES(95,'All files','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(96,'My files','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(97,'Shared folders','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(98,'All meeting assets','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(99,'Recordings','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(100,'Summaries','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(101,'My NotesNew','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(102,'Templates','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(103,'Trash','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(104,'Settings','wc_home','2026-06-21 18:17:25.993603','2026-06-21 18:23:10.858337',344,'left',10);
INSERT INTO "attendance_records" VALUES(105,'Notifications4','wc_home','2026-06-21 18:17:30.856201','2026-06-21 18:23:10.858337',340,'left',10);
INSERT INTO "attendance_records" VALUES(106,'Teacher','72086202578','2026-06-21 18:17:44.469266','2026-06-21 18:58:08.857260',2424,'left',11);
INSERT INTO "attendance_records" VALUES(107,'Teacher','72086202578','2026-06-22 18:44:03.046874','2026-06-22 18:44:06.131977',3,'left',12);
CREATE TABLE attendance_summaries (
	id INTEGER NOT NULL, 
	schedule_entry_id INTEGER NOT NULL, 
	meeting_session_id INTEGER, 
	student_id INTEGER NOT NULL, 
	student_name VARCHAR(255) NOT NULL, 
	group_name VARCHAR(255) NOT NULL, 
	lesson_title VARCHAR(255), 
	lesson_starts_at DATETIME NOT NULL, 
	lesson_ends_at DATETIME NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	total_seconds INTEGER NOT NULL, 
	generated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(schedule_entry_id) REFERENCES schedule_entries (id), 
	FOREIGN KEY(meeting_session_id) REFERENCES meetings (id), 
	FOREIGN KEY(student_id) REFERENCES students (id)
);
CREATE TABLE google_sheet_sources (
	id INTEGER NOT NULL, 
	session_id VARCHAR(255), 
	import_kind VARCHAR(32) NOT NULL, 
	sheet_id VARCHAR(255) NOT NULL, 
	sheet_url TEXT NOT NULL, 
	selected_tab VARCHAR(255) NOT NULL, 
	table_type VARCHAR(32) NOT NULL, 
	mapping_json TEXT NOT NULL, 
	warnings_json TEXT, 
	confidence_percent INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	last_synced_at DATETIME, auto_sync_enabled INTEGER DEFAULT 0 NOT NULL, headers_signature VARCHAR(64), 
	PRIMARY KEY (id)
);
CREATE TABLE import_mappings (
	id INTEGER NOT NULL, 
	session_id VARCHAR(255), 
	import_kind VARCHAR(32) NOT NULL, 
	table_type VARCHAR(32) NOT NULL, 
	source_name VARCHAR(255), 
	headers_signature VARCHAR(64) NOT NULL, 
	mapping_json TEXT NOT NULL, 
	warnings_json TEXT, 
	confidence_percent INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
CREATE TABLE import_runs (
	id INTEGER NOT NULL, 
	session_id VARCHAR(255), 
	import_kind VARCHAR(32) NOT NULL, 
	source_type VARCHAR(32) NOT NULL, 
	source_name VARCHAR(255), 
	source_id INTEGER, 
	status VARCHAR(32) NOT NULL, 
	row_count INTEGER NOT NULL, 
	imported_count INTEGER NOT NULL, 
	created_count INTEGER NOT NULL, 
	updated_count INTEGER NOT NULL, 
	skipped_count INTEGER NOT NULL, 
	errors_json TEXT, 
	started_at DATETIME NOT NULL, 
	finished_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE TABLE meetings (
	id INTEGER NOT NULL, 
	zoom_meeting_id VARCHAR(255) NOT NULL, 
	title VARCHAR(255), 
	group_name VARCHAR(255), 
	started_at DATETIME NOT NULL, 
	ended_at DATETIME, 
	created_at DATETIME NOT NULL, schedule_entry_id INTEGER, 
	PRIMARY KEY (id)
);
INSERT INTO "meetings" VALUES(1,'3780800730',NULL,NULL,'2026-06-12 12:35:37.711983','2026-06-20 14:38:40.249012','2026-06-12 12:35:37.711983',NULL);
INSERT INTO "meetings" VALUES(2,'3780800730',NULL,NULL,'2026-06-20 10:31:49.528775','2026-06-20 14:38:40.522408','2026-06-20 10:31:49.528775',NULL);
INSERT INTO "meetings" VALUES(3,'wc_home',NULL,NULL,'2026-06-20 10:31:56.130524','2026-06-20 14:38:40.993210','2026-06-20 10:31:56.130524',NULL);
INSERT INTO "meetings" VALUES(4,'78505992359',NULL,NULL,'2026-06-20 10:32:04.769527','2026-06-20 14:38:41.295374','2026-06-20 10:32:04.769527',NULL);
INSERT INTO "meetings" VALUES(5,'71024752381',NULL,NULL,'2026-06-20 11:11:28.967181','2026-06-20 14:38:41.940826','2026-06-20 11:11:28.967181',NULL);
INSERT INTO "meetings" VALUES(6,'73484408149',NULL,NULL,'2026-06-20 11:32:02.814870','2026-06-20 14:38:42.241190','2026-06-20 11:32:02.814870',NULL);
INSERT INTO "meetings" VALUES(7,'74160824332',NULL,NULL,'2026-06-20 11:36:54.094224','2026-06-20 14:38:38.237920','2026-06-20 11:36:54.094224',NULL);
INSERT INTO "meetings" VALUES(8,'73147809418',NULL,NULL,'2026-06-20 11:42:20.821068','2026-06-20 14:38:36.476713','2026-06-20 11:42:20.821068',NULL);
INSERT INTO "meetings" VALUES(9,'3780800730',NULL,NULL,'2026-06-21 18:17:11.366775','2026-06-21 18:58:20.307078','2026-06-21 18:17:11.366775',NULL);
INSERT INTO "meetings" VALUES(10,'wc_home',NULL,NULL,'2026-06-21 18:17:15.122888','2026-06-21 18:58:20.669272','2026-06-21 18:17:15.122888',NULL);
INSERT INTO "meetings" VALUES(11,'72086202578',NULL,NULL,'2026-06-21 18:17:23.726652','2026-06-22 18:36:36.145138','2026-06-21 18:17:23.726652',NULL);
INSERT INTO "meetings" VALUES(12,'72086202578',NULL,NULL,'2026-06-22 18:44:03.046874','2026-06-22 19:31:07.314817','2026-06-22 18:44:03.046874',NULL);
CREATE TABLE schedule_entries (
	id INTEGER NOT NULL, 
	title VARCHAR(255), 
	group_name VARCHAR(255) NOT NULL, 
	starts_at DATETIME NOT NULL, 
	ends_at DATETIME NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
CREATE TABLE student_aliases (
	id INTEGER NOT NULL, 
	student_id INTEGER NOT NULL, 
	alias_name VARCHAR(255) NOT NULL, 
	normalized_name VARCHAR(255) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES students (id)
);
CREATE TABLE students (
	id INTEGER NOT NULL, 
	full_name VARCHAR(255) NOT NULL, 
	normalized_name VARCHAR(255) NOT NULL, 
	group_name VARCHAR(255) NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
CREATE TABLE zoom_oauth_tokens (
	id INTEGER NOT NULL, 
	session_id VARCHAR(255) NOT NULL, 
	access_token_encrypted TEXT NOT NULL, 
	refresh_token_encrypted TEXT, 
	token_type VARCHAR(64), 
	scope TEXT, 
	api_url VARCHAR(255), 
	expires_at INTEGER NOT NULL, 
	zoom_user_id VARCHAR(255), 
	zoom_account_id VARCHAR(255), 
	zoom_email VARCHAR(255), 
	zoom_display_name VARCHAR(255), 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
INSERT INTO "zoom_oauth_tokens" VALUES(1,'ZDkYIuCXTltNzyMI8CrjPRbL0YR4YV3a35_n6Ub4sVM','gAAAAABqOAR8Iudclzs_Zkn7dD72QSDHBC_CXanLcgo7zXiDvvSzDuPV8Zz22ICxYLb7D62EParLPqMD_tGM83_rtxSYDGnPtG80T2swZ9KyOYO2gC7ClUA3miqgfEtpvjKreLx9-NzRACr6YCOlZLLtOlojCEiZ-XN8Tgi6gBIlAVeRkgx4zA8JWNTKreACDR_n_JTG5aYcBA5nE28aEHXx54NcjKdhkqR-Ss8tr0i9ZNyOrep6aM4PqYz0EIxihUR_BcvPUvXvcq9EF92DXgBP-oiXcf-JBFRnyxW7TxCzuu4JV1YiucA971cbt9fY9k9Cd8_IaHDbnFCrj-Lv241UbFT3q8dNGiOR-BvIYbR3gOOQu7vfSYhGTPoMUzcsl4eiiyXXAhaRk0wZ8Y3cgHBY8fSBSbM3n3B-Y8o-ug5aBtUhotx6zoDqFT2eCO2EBqYfv5xVnmhhwy-azJe4P2H1GPlem-LkITrrizEuHEEWs4Lgk6jVHscehQWmW5L_7ZvCqWq0ei5iiDpgBUgrBAEhdixLE72AcvPrWFOpjBY4syv6k74NO13sKSN54wsmeVJ5XB2CU4H69_08Y_gNmxBOFYpeVvoAGPmuqG_vsoT3DZy0lEEqv0aZk5Cj9C86SDzumlmvRi2eM_rPTBn49tf1ZZqGP7w6ObcgD6lumld94ISZIDgkWuh0ZynP5L_pA_6jN5ZQLL8z4xxDmZ48YSoRZjjXQ9vy4dc7-HiI7X155Jowih7A5YmI3vBLy1vzON81sSPowGchXkG6zO4LsAiI-l7W_oI2zTu6MNEaeot4HU_cXmkN_pAmk8rTQ7IKEEtFX7fKrUjSjXAAdkn9d_YUY6xOJk1mB8yB4EZzKUOA7l5ccbWd-srVv62REpEwFufq_VFZsRpiOC5ZrLE9tzPGi92OfasuMg==','gAAAAABqOAR8ml3fMsBKH9NKR4Thkx3N_rZMpiMR2X0xRTGOBokf8VnIrRJIqpMiTcVel6lR23WNfSdst9m29XLgT8F13R-Y8rvG_ewG_VS-SGBG83x7tgaY45JQhJkf44neNuLfDeXzUPQQ_n1NAYdPyF0M55JJFIn0Nqgbh9xq0IuHc9tAHhXcWh-9NIrN1Vhd7PXktJ-AHqP9W9ouYD-h3ONfXCrFpGiaN-hMbVFxiTDFfOrqJrxJdpVjoRrsJdF85io3JXgffkX7L6wnEjH70oFbb1HCjpPRKhr0M6KtTrVmF3M0sx-nN5sIWd6wTrVwJw8rQUSlH_fZEs4xFBLjD4RAJKVfKDIoHLR87t0uu7B0wBpq50QPCLbyteqpWu7mab813EutOwM3WcqewzGQkHJym1gQEjeOGeNZujxgIsqGuMCloVC7HvtA5oiFXAxLn2ZiG9XSp8CAqDzrppbDVgK-POoA-Ju3u9h7Y-_7Q6kPwmhYR_6puH7IGRFVlwXBZm1qRiDCNeTJjSFso2jiEWds1eQNe4VDXKOgcz9XagY3CgnW-BFLGUJD_ghmxm9BBS2brQn4_cRJwntmtjQUAQJu44bnr0CnCB8YRbukjPxeIKFFnZht3RwGz_EOrkE6wBqv2gTc_Eujux1R6m5nLOKwdXFS5GBeBXtpnMKfP45iE8ekFQXUkIArglM9H21Y6Gz5pWQWdXKtAxQPqvQru0cAijR-3TefcK8_f-QMMblabmYGFciVjExfwAzVDiEfrLc8MegdQtm6l_lihc_LQmUnCV8N2hO1RNF0rE7Hf6mrBpkX128HNJT3gjqc7yVGr6KDJ3s96udbiCW1L8Aliz9HUWDb1PZbFdnuuv6d1KbznTxRLbfmi6riAD3NjyZUyVqKnjjj1orpi9KaIA4asUkVN5aNHA==','bearer','user:read:user user:read:token user:read:zak meeting:read:meeting','https://api-us.zoom.us',1782059299,'7xm2D3g6RXOy4mb-sdfUBg','DYBTc8gkRUumR241rXUM-Q','nepejcevslava@gmail.com','Slava Nepeithev 252','2026-06-21 18:29:20.800159','2026-06-21 18:34:20.520224');
INSERT INTO "zoom_oauth_tokens" VALUES(4,'36X0xaiNKIa9NrR9TesJ4QNSJhg6XU5iq70BZcRaXH8','gAAAAABqObZJvKnEncAxLV7xm-4NStzQ8GA68RvGDn6w_kXYPMEBR_zD2rFYA2jM7jWWSfzOHc0zyJLa8l3To2g-tb5goZ4qeGZmLQNjOSlWMX6GiMmXalJFwJRJ7sYbNo5PCyOcJ-_rcgdKhy4-V6Vd95smUZJbKou-I5YaCNLfWSkpZBe5DxusfQLJz3INdVNGg1D_gLLPF82fGZnhDRB2R-_F1BoND2K07BDFJ3cYMFOm2b7NlU2oTsLQnRL01DYPDpid7lPwrmL5yhNaqu8Sk4B-sBoVt3dZ2vpFaQVqP1ZrFMHcAMmWNdLWvaW1f5J4oYVVFuepuZZ4dL_KuZOijLyZeOgoMvuMvnHAnnOUF16d4cf-VPrbDdNaRpcMPfYo3CxsaQb3lf8mas2co1D9qUEtEHVNYRvoqfk4RDdVvo_izpb3fgNwujeafqV9IxkV-N-aq9BZkcTsRJgNskCuZCBMuOtVlRMAqr2nEFUCfz9stt5lboaHYgv7O7oZjqD88pe5DJWN3BhSUpBO6DPJJlQGOm2p5ccsd7WXeW5w2QahAvVO3tnNtmVjwQJgqgXcIht30CgxdIo8H7GOcIyz0mx3pSYbFxbWc7yD67h_R76QN5C_viYoxYuUXWULH3cKp4n0H82KD3s0S86E_xY1c3orjTl75dcfeOlnACP2Jr8Isq38_OiKU_4m0heZHZZWhfAUUoefYdHEjOT6uufyS7C6cGJG304DxxcbLZWFoKieooNNUwszROhoUCIc6oYeViP2C9Dgcmiq-edNJ1OdK6KVmyfL9WE2FJ0_9QnIlWSH2lYVQ3rreD2cvFQD5ebVZM2zo4LNyzY68X2JmUJnlFyuJbllcfNSOtOkVuSx6NEDNrPmy6k4mLzqY9tDsaF5Pkk5i8s7qNCwYoV2NZz6Nx5aWQ8WQg==','gAAAAABqObZJ92-gpfFYA-pxrRim6yaAqy286m9BuuWVgVTms9xfRzOd67_WZ2AGsDwbFyT9xDPjsqkEMhHrPCvwWFvfyB6xtfVP7ta4_fa3X73PSDEcvNygBsk7OKvvK2s3JMI_h82MMHNn6Tg9zCcm1mAaCJluNvpvWwE5SetXsEClV1u5wU9QBFDikItjXjLnS35h_MrjV1hrrj3--ZhDE8pDeR1TpI5JfBamoVx42jUoH_9W7n3fDnHSALpAdoEZxHSFzoF_Sjb-hEDFBiAJoo8BsMwF2S9ERZPrTouBgT4FOIoTeLER4azETz20xPO7uuvjXFzeGpCY8xkMwrQnYp_qiFyHeIj3GxYi2aLeGEotVs8fxlsLGvb4L6ywbIddRUnhlYFdoacjFEo9wEErZnQm4C5FC57PCo7OvRJxV29bjKQ-Nwo4dEYcfocx1tARttAQaeQuthXhiRWoJbj3ewdf9mQlqFSrGaS3WGtz96jFGG0X0LExowsVCPkPZxCuJyeUBHS-LSocVRwA6GBsYgjgQ8QVrlK_gukXdSODq1AFq_Z7BHIpIGaN-uaALFPMGMPPYAlgPTo753lIJBtpem63YGy4M6Q0GIqFgNktY8mtnepRonPFtJr0vUHVXkzm0wGD0XVhAw_zk7FhbVhzYZIdBkpIeQFT8lnkxSA6fnCL9PNZKQ8hYlnWY36RZOz6Y-RA9ws5OGx46_HEviYIWl9uV0pitfmC-ELcjsgV29cAEXHzYBuUvbJMXE-imbRg3auW32Wc4cdj9JYN_YHdDNHy97XZ9LCrVjMt_Zuw1fUkGm71BxOaZ2LxpDLVUFTfdlVjYn1LWslUeKuc-k6xj5n1I-IWYGzeqjElUJwBR3ZcSW1lKfeCwOv5K4RRhLR0Wk8o1r7BOA_VMWwU3lq30sHFYUjFfQ==','bearer','user:read:user user:read:token user:read:zak meeting:read:meeting','https://api-us.zoom.us',1782170652,'7xm2D3g6RXOy4mb-sdfUBg','DYBTc8gkRUumR241rXUM-Q','nepejcevslava@gmail.com','Slava Nepeithev 252','2026-06-22 20:07:11.430597','2026-06-23 01:25:13.116760');
INSERT INTO "zoom_oauth_tokens" VALUES(5,'6Mkg8FuDMBVI1-1At1_xEGHtXch0QpYwKc8oClyc-XM','gAAAAABqOm9za4Ctx7zsn0EGmyeNvgooH1Pocnq_Tb_OepRtR6PiX_5PMPdMKV3T3vvRbjZ8SBwf99uhz4gWOBs03MhMho_CgbhIoo8UNbhERu6yoBWQxybTpImPkS-bsn5Vy2O5eJeH7a33IV3QpYwhqK9hBCgoAatksLMeZZIUZVEuZM4Z3cVMF4U9xZ5aIsYbtYLY-DpSVk_baNHBY8ebTnv2zG6iXeG5bwJRijEJ2QfpyIWqh2zEoyEVCjP0wKmDDsL-H6sPvo29VPfpEjGr5GeQ1DhFn_R-pgFx9GZ42NXsPRYYysYmsIrR1hABI8k0aPS9RcBDNs1v3k8ONNU4q8NEA4Uj4BCEHaHC4dO8LXECXgJUu-r9sQ9jNSKJkV0_WJPZH8qIbOYvPGUSex_bRLrsVGe-IyDNgo5teTduGZn0YNy2VxkkUQHqGmUYFl7kMlyNFwYf9kElLMRBxDpGngy72d1-kCfBWzKqbl3I8on-lvQzd2YkW7pPJbYOGP4ll7MkGaNjsJ6-wfZjquNIbWLVSev1QufnXHDm1IOK0vKLDV71VVanhjpYZLfw2hs6BGPwHd5eqT7OU22UhoUOIl-4r3ngWazhWPiPXjPyVGwRS1F_lhpPZTIX3RfTXjxRTU_RwjGRO-2zpT_GNLGRgkRoD5ds6ZesNWHg-FXC8DGWxakjGFCkbvHs0sw3JEidwLHbLApNf5TDHqssikbEbtHKsjVN4xY8t2kYrGgd3hsrhyJxGqlP0KGivlmlrRg4RbCi9rkEBUJcFMNEHvGr81s4yZ2wZGmwvUVEHhktYdHXn5RcBxXVtbq67XEYLut_YFkR4vC4B0S3lJYf24CsZ1NpjB0yOs-Pn6q62vvHfj-XsZ1dsHFl524idrD0cpMEeSidsPj5yFUwWkxn37caSFWQSHf4LA==','gAAAAABqOm9z_nKij-RvFbSp9AMTyPnABC2ip7nuktR6lYo3Pp4k7sYxedeEZGmmRAMyotTb60kbeMvZohBRIpCfQKol7O1ZfEaWXoY2NIm-AuUBOXP4hPAfx2FURI_4NpBOY34A7TKvGtKxVeE06E_DxxHAY315ao94MdGZQuBuokjXbaqgXFxsA7na-fVSNRvVG-5yeOWwaCgEKeKXe38Fv7fzXLymVNcmGbLecpiKfhZ2lARoB5cIdq4T7QBhI38SQEEi47wm85fm72o6FNeMwzAzwbiEmlh-w35VEqL9wgs6nxeR0FsmhEXvQtTBmXx8NIu3JZoZr69wkFi24QlOpdacDBLM0thnhbdrJyCMe5OKCUNXFiWjvLSZ18KM0Dyff7biQ_mThgfo_4b4ovu3Iw21HsMj73Ck3N_gzMxckaEnY2wRcEpi9WKd_pdyvCe4Yzgbgk9nl_xNWzv69XoU-GnlDsVehC7mVFnyHiyK1qpcDQhPTrJ_g2nXQJJR7HArAJvFtxeFRtF2M_yIUUR3k2OdmBPzLjkxHgHxql4nCItN2rN2xwKqKkDeqdSr5fyB9bvlz60qOpY6w7r8h6x3MpqDpKh0D9adnIsBNrM4DXJiWM7gR_262IXAmgkag6pwbtMNLB1qka7yQl2YcKADcOkz_MyNnzOESEP-hHs7KCGwMzUwiQQVabvcL044XDOFnu8K4SafD3fEBwhdsDVD-63QW40-dH35MlMJetvv-9jXq8C6eyBjokGMpCk1TqrNdicW4buB0f1DHG7WjLLHmHQcY73VjzqfbQi8iagw2q4uZhUrSiS-fnCQ6QcGLOGislAeMdUutKqb7zZKY_KhifIkzMa7M3eAq1gB3686kj_OCzO3dqzeQDBg3fOKnhM0BptWUxremHjhrnxTHjWY2hu_l3EKlA==','bearer','user:read:user user:read:token user:read:zak meeting:read:meeting','https://api-us.zoom.us',1782214605,'7xm2D3g6RXOy4mb-sdfUBg','DYBTc8gkRUumR241rXUM-Q','nepejcevslava@gmail.com','Slava Nepeithev 252','2026-06-23 13:37:46.352144','2026-06-23 14:35:15.623575');
CREATE TABLE zoom_saved_meetings (
	id INTEGER NOT NULL, 
	session_id VARCHAR(255) NOT NULL, 
	meeting_number VARCHAR(32) NOT NULL, 
	title VARCHAR(255), 
	passcode_encrypted TEXT, 
	join_as_host INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
INSERT INTO "zoom_saved_meetings" VALUES(1,'6Mkg8FuDMBVI1-1At1_xEGHtXch0QpYwKc8oClyc-XM','72086202578',NULL,'gAAAAABqOAWedfgZXg1Udwldy6NDoQYCuwYqoISUfXc2pIIzhd9jJVx37xjaCOsK17O2_ey3b1Yw4A-yiPXpX0TrV7pLvXHz2g==',1,'2026-06-21 18:39:10.471322','2026-06-21 18:39:10.471322');
CREATE INDEX ix_attendance_records_participant_name ON attendance_records (participant_name);
CREATE INDEX ix_attendance_records_id ON attendance_records (id);
CREATE INDEX ix_attendance_records_meeting_id ON attendance_records (meeting_id);
CREATE INDEX ix_meetings_id ON meetings (id);
CREATE INDEX ix_meetings_zoom_meeting_id ON meetings (zoom_meeting_id);
CREATE INDEX ix_meetings_group_name ON meetings (group_name);
CREATE INDEX ix_students_group_name ON students (group_name);
CREATE INDEX ix_students_full_name ON students (full_name);
CREATE INDEX ix_students_id ON students (id);
CREATE INDEX ix_students_normalized_name ON students (normalized_name);
CREATE INDEX ix_schedule_entries_id ON schedule_entries (id);
CREATE INDEX ix_schedule_entries_starts_at ON schedule_entries (starts_at);
CREATE INDEX ix_schedule_entries_ends_at ON schedule_entries (ends_at);
CREATE INDEX ix_schedule_entries_group_name ON schedule_entries (group_name);
CREATE INDEX ix_attendance_summaries_student_name ON attendance_summaries (student_name);
CREATE INDEX ix_attendance_summaries_group_name ON attendance_summaries (group_name);
CREATE INDEX ix_attendance_summaries_status ON attendance_summaries (status);
CREATE INDEX ix_attendance_summaries_meeting_session_id ON attendance_summaries (meeting_session_id);
CREATE INDEX ix_attendance_summaries_id ON attendance_summaries (id);
CREATE INDEX ix_attendance_summaries_schedule_entry_id ON attendance_summaries (schedule_entry_id);
CREATE INDEX ix_attendance_summaries_lesson_starts_at ON attendance_summaries (lesson_starts_at);
CREATE INDEX ix_attendance_summaries_student_id ON attendance_summaries (student_id);
CREATE INDEX ix_student_aliases_student_id ON student_aliases (student_id);
CREATE INDEX ix_student_aliases_alias_name ON student_aliases (alias_name);
CREATE INDEX ix_student_aliases_id ON student_aliases (id);
CREATE INDEX ix_student_aliases_normalized_name ON student_aliases (normalized_name);
CREATE UNIQUE INDEX ix_zoom_oauth_tokens_session_id ON zoom_oauth_tokens (session_id);
CREATE INDEX ix_zoom_oauth_tokens_zoom_account_id ON zoom_oauth_tokens (zoom_account_id);
CREATE INDEX ix_zoom_oauth_tokens_id ON zoom_oauth_tokens (id);
CREATE INDEX ix_zoom_oauth_tokens_zoom_email ON zoom_oauth_tokens (zoom_email);
CREATE INDEX ix_zoom_oauth_tokens_zoom_user_id ON zoom_oauth_tokens (zoom_user_id);
CREATE INDEX ix_zoom_saved_meetings_session_id ON zoom_saved_meetings (session_id);
CREATE INDEX ix_zoom_saved_meetings_meeting_number ON zoom_saved_meetings (meeting_number);
CREATE INDEX ix_zoom_saved_meetings_id ON zoom_saved_meetings (id);
CREATE INDEX ix_import_mappings_import_kind ON import_mappings (import_kind);
CREATE INDEX ix_import_mappings_table_type ON import_mappings (table_type);
CREATE INDEX ix_import_mappings_id ON import_mappings (id);
CREATE INDEX ix_import_mappings_session_id ON import_mappings (session_id);
CREATE INDEX ix_import_mappings_headers_signature ON import_mappings (headers_signature);
CREATE INDEX ix_google_sheet_sources_import_kind ON google_sheet_sources (import_kind);
CREATE INDEX ix_google_sheet_sources_session_id ON google_sheet_sources (session_id);
CREATE INDEX ix_google_sheet_sources_sheet_id ON google_sheet_sources (sheet_id);
CREATE INDEX ix_google_sheet_sources_id ON google_sheet_sources (id);
CREATE INDEX ix_google_sheet_sources_table_type ON google_sheet_sources (table_type);
CREATE INDEX ix_import_runs_session_id ON import_runs (session_id);
CREATE INDEX ix_import_runs_import_kind ON import_runs (import_kind);
CREATE INDEX ix_import_runs_id ON import_runs (id);
CREATE INDEX ix_import_runs_source_id ON import_runs (source_id);
CREATE INDEX ix_import_runs_source_type ON import_runs (source_type);
CREATE INDEX ix_import_runs_status ON import_runs (status);
COMMIT;
